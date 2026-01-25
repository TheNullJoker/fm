import { useState, useMemo, useEffect } from 'react';
import { useGameData } from './useGameData';
import { useProfile } from '../context/ProfileContext';
import { useTreeMode } from '../context/TreeModeContext';

export function useMountsCalculator() {
    const { profile, updateProfile } = useProfile();
    const { treeMode } = useTreeMode();

    // 1. Data Loading
    const { data: mountSummonConfig } = useGameData<any>('MountSummonConfig.json');
    const { data: mountSummonUpgradeLibrary } = useGameData<any>('MountSummonUpgradeLibrary.json');
    const { data: mountSummonDropChancesLibrary } = useGameData<any>('MountSummonDropChancesLibrary.json');
    const { data: guildWarDayConfigLibrary } = useGameData<any>('GuildWarDayConfigLibrary.json');
    const { data: techTreeLibrary } = useGameData<any>('TechTreeLibrary.json');
    const { data: techTreeMapping } = useGameData<any>('TechTreeMapping.json');

    // 2. State (Initialized from Profile)
    const [level, setLevel] = useState(profile.misc.mountCalculatorLevel || 1);
    const [progress, setProgress] = useState(profile.misc.mountCalculatorProgress || 0);
    const [windersCount, setWindersCount] = useState(profile.misc.mountCalculatorWinders || 0);

    // Sync state to profile
    useEffect(() => {
        updateProfile({
            misc: {
                ...profile.misc,
                mountCalculatorLevel: level,
                mountCalculatorProgress: progress,
                mountCalculatorWinders: windersCount
            }
        });
    }, [level, progress, windersCount]);

    // 3. Tech Bonuses (Re-using logic from Skill Calculator for consistency)
    const techBonuses = useMemo(() => {
        if (!techTreeLibrary || !techTreeMapping) {
            return { costReduction: 0, extraChance: 0 };
        }

        let costReduction = 0;
        let extraChance = 0;

        Object.entries(profile.techTree).forEach(([treeName, treeNodes]) => {
            const treeDef = techTreeMapping.trees?.[treeName];
            if (!treeDef || !treeDef.nodes) return;

            treeDef.nodes.forEach((node: any) => {
                const nodeType = node.type;
                const config = techTreeLibrary[nodeType];
                if (!config) return;

                const maxLevel = config.MaxLevel || 0;
                let nodeLevel = 0;

                if (treeMode === 'max') nodeLevel = maxLevel;
                else if (treeMode === 'empty') nodeLevel = 0;
                else nodeLevel = (treeNodes as any)[node.id] || 0;

                if (nodeLevel > 0 && config.Stats?.[0]) {
                    const stat = config.Stats[0];
                    const val = stat.Value + ((nodeLevel - 1) * stat.ValueIncrease);

                    if (nodeType === 'MountSummonCost') {
                        costReduction += val;
                    } else if (nodeType === 'ExtraMountChance') {
                        extraChance += val;
                    }
                }
            });
        });

        return {
            costReduction: Math.min(0.9, costReduction),
            extraChance: extraChance
        };
    }, [techTreeLibrary, techTreeMapping, treeMode, profile]);

    // 4. Constants from config
    const BASE_COST = mountSummonConfig?.SummonCost || 50;
    const MOUNTS_PER_SUMMON = 1 + techBonuses.extraChance;
    const finalCostPerSummon = Math.ceil(BASE_COST * (1 - techBonuses.costReduction));

    // 5. Simulation Results
    const results = useMemo(() => {
        if (!mountSummonUpgradeLibrary || !mountSummonDropChancesLibrary || !guildWarDayConfigLibrary) {
            return null;
        }

        const pointsBreakdown: Record<string, { summon: number; merge: number }> = {};
        const day2 = guildWarDayConfigLibrary["2"]; // Day 2 is usually Mount day
        if (day2) {
            ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'].forEach(rarity => {
                const summonTask = day2.Tasks.find((t: any) => t.Task === `Summon${rarity}Mount`);
                const mergeTask = day2.Tasks.find((t: any) => t.Task === `Merge${rarity}Mount`);
                pointsBreakdown[rarity] = {
                    summon: summonTask?.Rewards?.[0]?.Amount || 0,
                    merge: mergeTask?.Rewards?.[0]?.Amount || 0
                };
            });
        }

        const totalPaidSummons = Math.floor(windersCount / Math.max(1, finalCostPerSummon));

        // Simulation state
        let currentLevel = level;
        let currentProgress = progress;

        const breakdown: Record<string, { count: number; summonPoints: number; mergePoints: number }> = {
            Common: { count: 0, summonPoints: 0, mergePoints: 0 },
            Rare: { count: 0, summonPoints: 0, mergePoints: 0 },
            Epic: { count: 0, summonPoints: 0, mergePoints: 0 },
            Legendary: { count: 0, summonPoints: 0, mergePoints: 0 },
            Ultimate: { count: 0, summonPoints: 0, mergePoints: 0 },
            Mythic: { count: 0, summonPoints: 0, mergePoints: 0 }
        };

        let totalSummonPoints = 0;
        let totalMergePoints = 0;

        // Perform simulation summons one by one to track level progression
        for (let i = 0; i < totalPaidSummons; i++) {
            const probabilities = mountSummonDropChancesLibrary[(currentLevel - 1).toString()];
            if (probabilities) {
                Object.entries(probabilities).forEach(([rarity, chance]) => {
                    if (typeof chance !== 'number' || rarity === 'Level') return;

                    const expectedCount = chance * MOUNTS_PER_SUMMON;
                    const sPts = expectedCount * (pointsBreakdown[rarity]?.summon || 0);
                    const mPts = expectedCount * (pointsBreakdown[rarity]?.merge || 0);

                    if (breakdown[rarity]) {
                        breakdown[rarity].count += expectedCount;
                        breakdown[rarity].summonPoints += sPts;
                        breakdown[rarity].mergePoints += mPts;
                        totalSummonPoints += sPts;
                        totalMergePoints += mPts;
                    }
                });
            }

            // Progress Level
            currentProgress++;
            const threshold = mountSummonUpgradeLibrary[currentLevel.toString()]?.Summons;
            if (threshold && currentProgress >= threshold) {
                currentLevel++;
                currentProgress = 0;
            }
        }

        return {
            totalSummons: totalPaidSummons,
            endLevel: currentLevel,
            endProgress: currentProgress,
            totalPoints: totalSummonPoints + totalMergePoints,
            totalSummonPoints,
            totalMergePoints,
            breakdown: Object.entries(breakdown)
                .map(([rarity, data]) => ({
                    rarity,
                    ...data,
                    percentage: (probabilitiesForCurrentLevel(currentLevel)[rarity] || 0) * 100,
                    pointsPerUnit: pointsBreakdown[rarity]
                }))
                .filter(b => b.count > 0 || b.percentage > 0),
            finalCost: finalCostPerSummon,
            baseCost: BASE_COST,
            costReduction: techBonuses.costReduction
        };

        function probabilitiesForCurrentLevel(lvl: number) {
            return mountSummonDropChancesLibrary[(lvl - 1).toString()] || {};
        }

    }, [windersCount, level, progress, mountSummonUpgradeLibrary, mountSummonDropChancesLibrary, guildWarDayConfigLibrary, techBonuses, finalCostPerSummon, BASE_COST, MOUNTS_PER_SUMMON]);

    // Max Level Helper
    const maxPossibleLevel = useMemo(() => {
        if (!mountSummonDropChancesLibrary) return 50;
        const keys = Object.keys(mountSummonDropChancesLibrary).map(Number);
        return Math.max(...keys) + 1; // 0-49 indices => 1-50 levels
    }, [mountSummonDropChancesLibrary]);

    // Action to apply results to profile
    const applyResultsToProfile = () => {
        if (!results) return;
        setLevel(results.endLevel);
        setProgress(results.endProgress);
        // We don't deduct winders automatically, user might want to check again.
        // But we update the level/progress which is what the user asked.
    };

    return {
        level, setLevel,
        progress, setProgress,
        windersCount, setWindersCount,
        techBonuses,
        results,
        maxPossibleLevel,
        mountSummonUpgradeLibrary,
        applyResultsToProfile
    };
}
