import { useState, useMemo, useEffect } from 'react';
import { useGameData } from './useGameData';
import { useProfile } from '../context/ProfileContext';
import { eggDropRates } from '../constants/eggData';

export interface EggOptimizationResult {
    toOpen: Record<string, number>;
    totalPoints: number;
    hatchPoints: number;
    mergePoints: number;
    timeUsed: number;
    timeLeft: number;
}

export function useEggsCalculator() {
    // Game Data
    const { data: eggLibrary } = useGameData<any>('EggLibrary.json');
    const { data: guildWarConfig } = useGameData<any>('GuildWarDayConfigLibrary.json');
    const { data: techTreeMapping } = useGameData<any>('TechTreeMapping.json');
    const { data: techTreeLibrary } = useGameData<any>('TechTreeLibrary.json');
    const { profile } = useProfile();

    // --- Optimization State ---
    const [ownedEggs, setOwnedEggs] = useState<Record<string, number>>({
        Common: 0, Rare: 0, Epic: 0, Legendary: 0, Ultimate: 0, Mythic: 0
    });
    const [timeLimitHours, setTimeLimitHours] = useState(24);
    const [availableSlots, setAvailableSlots] = useState(3);

    // --- Drop Rate State ---
    const [difficulty, setDifficulty] = useState('1-1');
    const [manualSpeedBonus, setManualSpeedBonus] = useState(0);

    // Load State
    useEffect(() => {
        if (profile) {
            const savedOwned = localStorage.getItem('eggCalc_owned');
            if (savedOwned) setOwnedEggs(JSON.parse(savedOwned));

            if (profile.misc?.eggSlots) {
                setAvailableSlots(profile.misc.eggSlots);
            }
        }

        const savedDiff = localStorage.getItem('eggDifficulty');
        if (savedDiff && eggDropRates[savedDiff]) setDifficulty(savedDiff);
    }, [profile]);

    // Save State
    const updateOwnedEggs = (rarity: string, count: number) => {
        const newEggs = { ...ownedEggs, [rarity]: count };
        setOwnedEggs(newEggs);
        localStorage.setItem('eggCalc_owned', JSON.stringify(newEggs));

        // Optional: Save to profile if we had a dedicated field
    };

    useEffect(() => {
        localStorage.setItem('eggDifficulty', difficulty);
    }, [difficulty]);

    // --- Drop Rate Logic ---
    const rates = useMemo(() => {
        return eggDropRates[difficulty] || {};
    }, [difficulty]);

    const probabilityData = useMemo(() => {
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic']; // lowercase in eggData?
        // Check eggData keys. Usually they are lowercase in constants, capitalized in GameData.
        // Assuming lowercase 'common' matches `eggDropRates` keys.
        return tiers.filter(tier => rates[tier]).map(tier => ({
            tier, // Keep original case
            probability: rates[tier]
        }));
    }, [rates]);

    // --- Hatch Time Logic (Shared) ---
    // We calculate "Optimized Time" (using Profile) AND "Manual Time" (using Input).
    // The UI uses 'hatchingTimes' for display.
    // Let's return both or normalize.
    // The "Info" tab uses 'hatchingTimes' based on 'speedBonus' (manual).
    // The "Calculator" tab uses Profile bonuses.

    // 1. Profile-based Hatch Values (for Calculator)
    const hatchValuesProfile = useMemo(() => {
        if (!eggLibrary || !profile?.techTree || !techTreeMapping) return null;

        const times: Record<string, number> = {};
        const raritiesKeys = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];

        // Helper to find Node ID by Type name in SkillsPetTech tree
        const findNodeId = (type: string): number | null => {
            const nodes = techTreeMapping.trees?.SkillsPetTech?.nodes;
            if (!nodes) return null;
            const node = nodes.find((n: any) => n.type === type);
            return node ? node.id : null;
        };

        raritiesKeys.forEach(rarity => {
            let baseTime = eggLibrary[rarity]?.HatchTime || 0;
            let speedDivisor = 1.0;

            // 1. Find the Node Config in Library (for stats per level)
            const nodeTypeName = `${rarity}EggTimer`; // e.g. CommonEggTimer
            const nodeConfig = techTreeLibrary?.[nodeTypeName];

            // 2. Find the Node ID in Mapping (to start lookup in Profile)
            const nodeId = findNodeId(nodeTypeName);

            if (nodeConfig && nodeId !== null) {
                // 3. Get User Level from Profile
                // Access dynamic key safely
                const userLevel = profile.techTree.SkillsPetTech?.[nodeId] || 0;
                if (userLevel > 0) {
                    const stat = nodeConfig.Stats?.[0]; // Usually only one stat for these
                    if (stat) {
                        const valIncrease = stat.ValueIncrease || 0; // e.g. 0.10
                        // Bonus is additive: 1 + (Level * 0.10)
                        speedDivisor += (userLevel * valIncrease);
                    }
                }
            }
            times[rarity] = baseTime / speedDivisor;
        });
        return times;
    }, [eggLibrary, profile, techTreeLibrary, techTreeMapping]);

    // 2. Manual Hatch Values (for Info Tab)
    const hatchValuesManual = useMemo(() => {
        if (!eggLibrary) return {};
        const times: Record<string, number> = {};
        // Manual bonus is %. e.g. 50 = +50% speed? = Divisor 1.5? Or reduction?
        // Previous code: base / (1 + speedBonus/100)
        const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];
        const lowerRarities = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'];

        rarities.forEach((rarity, idx) => {
            // Mapping Case if needed. EggLibrary uses Capitalized.
            const baseTime = eggLibrary[rarity]?.HatchTime || 0;
            times[lowerRarities[idx]] = baseTime / (1 + (manualSpeedBonus / 100)); // Map to lower for Info Tab display?
            // Actually 'probabilityData' uses lowercase.
        });
        return times;
    }, [eggLibrary, manualSpeedBonus]);

    // --- War Logic ---
    const warPoints = useMemo(() => {
        if (!guildWarConfig) return null;
        // Day 1 seems to be the Summon/Merge day based on task list
        const dayConfig = guildWarConfig["1"]; // Day 1
        if (!dayConfig) return null;

        const points: Record<string, { hatch: number, merge: number }> = {};
        const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];

        rarities.forEach(rarity => {
            const hatchTask = dayConfig.Tasks.find((t: any) => t.Task === `Hatch${rarity}Egg`);
            const mergeTask = dayConfig.Tasks.find((t: any) => t.Task === `Merge${rarity}Pet`);

            points[rarity] = {
                hatch: hatchTask?.Rewards?.[0]?.Amount || 0,
                merge: mergeTask?.Rewards?.[0]?.Amount || 0
            };
        });

        return points;
    }, [guildWarConfig]);

    // --- Optimization Logic ---
    const optimization = useMemo((): EggOptimizationResult | null => {
        if (!hatchValuesProfile || !warPoints) return null;

        const totalMinutesAvailable = timeLimitHours * 60;
        const totalSlotMinutes = totalMinutesAvailable * availableSlots;

        let remainingSlotMinutes = totalSlotMinutes;
        const toOpen: Record<string, number> = {};
        const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];

        // Metrics for Efficiency: Points per Minute
        // Note: Opening an egg gives Hatch Points AND potential Merge points.
        // If we assume we hold onto them to merge, 1 Hatch = 1 Pet.
        // 5 Pets = 1 Merge + 1 Next Rarity Pet.
        // For simple maximization, we focus on Hatch Points density first?
        // Actually, pure Hatch Points per minute is the constraint for TIME.
        // Merge points come "free" instantly after hatching.

        const efficiencies = rarities.map(rarity => {
            const hatchTimeMin = (hatchValuesProfile[rarity] || 0) / 60;
            const pts = warPoints[rarity]?.hatch || 0;
            // Add expected merge value? (1/5 of a merge reward)
            // + (MergePoints / 5)? 
            // Let's stick to Hatch Efficiency for the Knapsack, as Merges are derivative.

            const eff = hatchTimeMin > 0 ? pts / hatchTimeMin : 0;
            return { rarity, eff, timeCost: hatchTimeMin };
        }).sort((a, b) => b.eff - a.eff); // Highest efficiency first

        // Fill slots
        efficiencies.forEach(({ rarity, timeCost }) => {
            const count = ownedEggs[rarity] || 0;
            if (count === 0) return;

            const maxCanDo = Math.floor(remainingSlotMinutes / timeCost);
            const doCount = Math.min(count, maxCanDo);

            toOpen[rarity] = doCount;
            remainingSlotMinutes -= (doCount * timeCost);
        });

        // Compute Totals
        let hPoints = 0;
        let mPoints = 0;

        Object.keys(toOpen).forEach(rarity => {
            const count = toOpen[rarity];
            if (count > 0) {
                hPoints += count * (warPoints[rarity]?.hatch || 0);

                // Estimate Merges:
                // Simple logic: Every 5 opened gives 1 merge of THIS rarity (creating next)
                // BUT, user might already have some. Ideally, "Total Owned after Open" / 5.
                // Calculator asks for "Number of Eggs". Assuming they open them all.
                // Let's assume user merges everything they hatch.
                const merges = Math.floor(count / 5);
                mPoints += merges * (warPoints[rarity]?.merge || 0);
            }
        });

        return {
            toOpen,
            totalPoints: hPoints + mPoints,
            hatchPoints: hPoints,
            mergePoints: mPoints,
            timeUsed: (totalSlotMinutes - remainingSlotMinutes) / availableSlots, // Average time used per slot? or Total?
            // Actually "Time Used" usually means "When will I finish?". 
            // If valid, it's total minutes / slots.
            timeLeft: remainingSlotMinutes / availableSlots
        };

    }, [ownedEggs, timeLimitHours, availableSlots, hatchValuesProfile, warPoints]);

    return {
        // Optimization
        ownedEggs, setOwnedEggs, updateOwnedEggs,
        timeLimitHours, setTimeLimitHours,
        availableSlots, setAvailableSlots,
        hatchValues: hatchValuesProfile, // Default to profile values
        optimization,

        // Info / Manual
        difficulty, setDifficulty,
        speedBonus: manualSpeedBonus, setSpeedBonus: setManualSpeedBonus,
        hatchingTimes: hatchValuesManual, // For info tab using manual speed
        probabilityData
    };
}
