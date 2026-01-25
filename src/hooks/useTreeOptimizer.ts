import { useState, useMemo, useEffect } from 'react';
import { useGameData } from './useGameData';
import { useProfile } from '../context/ProfileContext';
import { useTreeMode } from '../context/TreeModeContext';

export interface TechUpgrade {
    tree: string;
    nodeId: number;
    nodeName: string;
    type: string;
    fromLevel: number;
    toLevel: number;
    cost: number;
    duration: number;
    points: number;
    tier: number;
    sprite_rect?: { x: number; y: number; width: number; height: number };
}

export function useTreeOptimizer() {
    const { profile, updateProfile } = useProfile();
    const { treeMode } = useTreeMode();

    // 1. Data Loading
    const { data: mapping } = useGameData<any>('TechTreeMapping.json');
    const { data: library } = useGameData<any>('TechTreeLibrary.json');
    const { data: upgradeLibrary } = useGameData<any>('TechTreeUpgradeLibrary.json');
    const { data: dayConfig } = useGameData<any>('GuildWarDayConfigLibrary.json');

    // 2. State
    const [timeLimitHours, setTimeLimitHours] = useState(24); // Default 24h
    const [potions, setPotions] = useState(profile.misc.techPotions || 0);

    // Sync potions to profile
    useEffect(() => {
        updateProfile({
            misc: {
                ...profile.misc,
                techPotions: potions
            }
        });
    }, [potions]);

    // 3. Tech Bonuses Helper
    const calculateTechBonuses = (tree: Record<string, Record<number, number>>) => {
        let costReduction = 0;
        let speedBonus = 0;

        Object.entries(tree).forEach(([treeName, treeNodes]) => {
            const treeDef = mapping?.trees?.[treeName];
            if (!treeDef || !treeDef.nodes) return;

            treeDef.nodes.forEach((node: any) => {
                const nodeType = node.type;
                if (nodeType !== 'TechNodeUpgradeCost' && nodeType !== 'TechResearchTimer') return;

                const nodeConfig = library[nodeType];
                if (!nodeConfig) return;

                const nodeLevel = treeNodes[node.id] || 0;
                if (nodeLevel > 0 && nodeConfig.Stats?.[0]) {
                    const stat = nodeConfig.Stats[0];
                    const val = stat.Value + ((nodeLevel - 1) * stat.ValueIncrease);
                    if (nodeType === 'TechNodeUpgradeCost') {
                        costReduction += val;
                    } else if (nodeType === 'TechResearchTimer') {
                        speedBonus += val;
                    }
                }
            });
        });

        return {
            costReduction: Math.min(0.95, costReduction), // Cap at 95%
            speedBonus
        };
    };

    // 4. Optimization Logic
    const optimization = useMemo(() => {
        if (!mapping || !library || !upgradeLibrary || !dayConfig) return null;

        // Map Tier -> Points
        const tierPoints: Record<number, number> = {
            0: 300,   // I
            1: 7500,  // II
            2: 20000, // III
            3: 35000, // IV
            4: 62000  // V
        };

        // Initialize Virtual Tree (based on My/Max/Empty mode)
        const currentTree: Record<string, Record<number, number>> = {
            Forge: { ...profile.techTree.Forge },
            Power: { ...profile.techTree.Power },
            SkillsPetTech: { ...profile.techTree.SkillsPetTech }
        };

        if (treeMode === 'max') {
            // If mode is max, we can't really optimize further
            return { totalPoints: 0, actions: [], timeUsed: 0, potionsUsed: 0 };
        }
        if (treeMode === 'empty') {
            currentTree.Forge = {};
            currentTree.Power = {};
            currentTree.SkillsPetTech = {};
        }

        let totalPoints = 0;
        let timeRemainingSeconds = timeLimitHours * 3600;
        let potionsRemaining = potions;
        const actions: TechUpgrade[] = [];

        // Simple Greedy Simulation
        // While we have time and potions, find all "available" upgrades
        // Selection criteria: Max (Points / Duration) to fit most inside 1h or 24h?
        // Actually Max Points / Duration is usually best for time-limited ranking

        const maxIter = 500; // Safety break
        let iter = 0;

        while (timeRemainingSeconds > 0 && potionsRemaining > 0 && iter < maxIter) {
            iter++;
            const possibleUpgrades: TechUpgrade[] = [];

            // Calculate current bonuses
            const bonuses = calculateTechBonuses(currentTree);

            // Find all available upgrades
            Object.entries(mapping.trees || {}).forEach(([treeName, treeDef]: [string, any]) => {
                treeDef.nodes.forEach((node: any) => {
                    const currentLvl = currentTree[treeName]?.[node.id] || 0;
                    const nodeType = node.type;
                    const nodeConfig = library[nodeType];
                    const maxLvl = nodeConfig?.MaxLevel || 0;

                    if (currentLvl < maxLvl) {
                        // Check requirements
                        const reqsMet = (node.requirements || []).every((reqId: number) => {
                            return (currentTree[treeName]?.[reqId] || 0) >= 1; // Usually need lvl 1 to unlock next
                        });

                        if (reqsMet) {
                            const tier = node.tier || 0;
                            const upgradeData = upgradeLibrary[tier.toString()];
                            if (upgradeData) {
                                const levelData = upgradeData.Levels.find((l: any) => l.Level === currentLvl);
                                if (levelData) {
                                    // Apply bonuses
                                    const finalCost = Math.ceil(levelData.Cost * (1 - bonuses.costReduction));
                                    const finalDuration = Math.ceil(levelData.Duration / (1 + bonuses.speedBonus));

                                    possibleUpgrades.push({
                                        tree: treeName,
                                        nodeId: node.id,
                                        nodeName: nodeType, // Using type as name for now
                                        type: nodeType,
                                        fromLevel: currentLvl,
                                        toLevel: currentLvl + 1,
                                        cost: finalCost,
                                        duration: finalDuration,
                                        points: tierPoints[tier] || 0,
                                        tier,
                                        sprite_rect: node.sprite_rect
                                    });
                                }
                            }
                        }
                    }
                });
            });

            if (possibleUpgrades.length === 0) break;

            // Sort by efficiency (Points / Duration)
            // If duration is 0, give it high priority
            possibleUpgrades.sort((a, b) => (b.points / (b.duration || 1)) - (a.points / (a.duration || 1)));

            // Find first one that fits budget
            const best = possibleUpgrades.find(upg => upg.cost <= potionsRemaining && upg.duration <= timeRemainingSeconds);

            if (best) {
                actions.push(best);
                totalPoints += best.points;
                potionsRemaining -= best.cost;
                timeRemainingSeconds -= best.duration;
                // Update virtual tree
                if (!currentTree[best.tree]) currentTree[best.tree] = {};
                currentTree[best.tree][best.nodeId] = best.toLevel;
            } else {
                // No more upgrades fit
                break;
            }
        }

        return {
            totalPoints,
            actions,
            timeUsed: (timeLimitHours * 3600 - timeRemainingSeconds) / 3600,
            potionsUsed: potions - potionsRemaining,
            remainingPotions: potionsRemaining,
            finalBonuses: calculateTechBonuses(currentTree)
        };

    }, [mapping, library, upgradeLibrary, dayConfig, treeMode, profile.techTree, timeLimitHours, potions]);

    const applyUpgrades = (selectedActions: TechUpgrade[]) => {
        if (selectedActions.length === 0) return;

        const newTree = {
            Forge: { ...profile.techTree.Forge },
            Power: { ...profile.techTree.Power },
            SkillsPetTech: { ...profile.techTree.SkillsPetTech }
        };

        let totalCost = 0;
        selectedActions.forEach(action => {
            if (!newTree[action.tree as keyof typeof newTree]) {
                newTree[action.tree as keyof typeof newTree] = {};
            }
            newTree[action.tree as keyof typeof newTree][action.nodeId] = action.toLevel;
            totalCost += action.cost;
        });

        updateProfile({
            techTree: newTree,
            misc: {
                ...profile.misc,
                techPotions: Math.max(0, potions - totalCost)
            }
        });

        // Update local potions state to match new profile value
        setPotions(Math.max(0, potions - totalCost));
    };

    return {
        timeLimitHours, setTimeLimitHours,
        potions, setPotions,
        optimization,
        applyUpgrades
    };
}
