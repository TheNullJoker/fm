import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Calculator, HelpCircle, X } from 'lucide-react';
import { EquipmentPanel } from '../../components/Profile/EquipmentPanel';
import { PetPanel } from '../../components/Profile/PetPanel';
import { ProfileContext, useProfile } from '../../context/ProfileContext';
import { useGameData } from '../../hooks/useGameData';
import { useTreeMode } from '../../context/TreeModeContext';
import { calculateStats, type AggregatedStats, type LibraryData } from '../../utils/statEngine';
import { formatSecondaryStat } from '../../utils/statNames';
import type { UserProfile } from '../../types/Profile';

function cloneProfile(profile: UserProfile): UserProfile {
    return JSON.parse(JSON.stringify(profile)) as UserProfile;
}

function useStatsForProfile(profile: UserProfile): AggregatedStats | null {
    const { treeMode } = useTreeMode();

    const { data: petUpgradeLibrary } = useGameData<any>('PetUpgradeLibrary.json');
    const { data: petBalancingLibrary } = useGameData<any>('PetBalancingLibrary.json');
    const { data: petLibrary } = useGameData<any>('PetLibrary.json');
    const { data: skillLibrary } = useGameData<any>('SkillLibrary.json');
    const { data: skillPassiveLibrary } = useGameData<any>('SkillPassiveLibrary.json');
    const { data: mountUpgradeLibrary } = useGameData<any>('MountUpgradeLibrary.json');
    const { data: techTreeLibrary } = useGameData<any>('TechTreeLibrary.json');
    const { data: techTreePositionLibrary } = useGameData<any>('TechTreePositionLibrary.json');
    const { data: itemBalancingLibrary } = useGameData<any>('ItemBalancingLibrary.json');
    const { data: itemBalancingConfig } = useGameData<any>('ItemBalancingConfig.json');
    const { data: weaponLibrary } = useGameData<any>('WeaponLibrary.json');
    const { data: projectilesLibrary } = useGameData<any>('ProjectilesLibrary.json');
    const { data: secondaryStatLibrary } = useGameData<any>('SecondaryStatLibrary.json');

    const libs: LibraryData = useMemo(() => ({
        petUpgradeLibrary,
        petBalancingLibrary,
        petLibrary,
        skillLibrary,
        skillPassiveLibrary,
        mountUpgradeLibrary,
        techTreeLibrary,
        techTreePositionLibrary,
        itemBalancingLibrary,
        itemBalancingConfig,
        weaponLibrary,
        projectilesLibrary,
        secondaryStatLibrary,
    }), [
        petUpgradeLibrary,
        petBalancingLibrary,
        petLibrary,
        skillLibrary,
        skillPassiveLibrary,
        mountUpgradeLibrary,
        techTreeLibrary,
        techTreePositionLibrary,
        itemBalancingLibrary,
        itemBalancingConfig,
        weaponLibrary,
        projectilesLibrary,
        secondaryStatLibrary,
    ]);

    const effectiveProfile = useMemo((): UserProfile => {
        if (treeMode === 'my') return profile;
        if (treeMode === 'empty') {
            return {
                ...profile,
                techTree: {
                    Forge: {},
                    Power: {},
                    SkillsPetTech: {},
                },
            };
        }

        const maxTree: UserProfile['techTree'] = {
            Forge: {},
            Power: {},
            SkillsPetTech: {},
        };

        if (techTreePositionLibrary && techTreeLibrary) {
            const trees: ('Forge' | 'Power' | 'SkillsPetTech')[] = ['Forge', 'Power', 'SkillsPetTech'];
            for (const tree of trees) {
                const treeData = techTreePositionLibrary[tree];
                if (!treeData?.Nodes) continue;
                for (const node of treeData.Nodes) {
                    const nodeData = techTreeLibrary[node.Type];
                    const maxLevel = nodeData?.MaxLevel || 5;
                    maxTree[tree][node.Id] = maxLevel;
                }
            }
        }

        return {
            ...profile,
            techTree: maxTree,
        };
    }, [profile, treeMode, techTreePositionLibrary, techTreeLibrary]);

    const stats = useMemo(() => {
        if (!itemBalancingConfig || !itemBalancingLibrary) return null;
        return calculateStats(effectiveProfile, libs);
    }, [effectiveProfile, libs, itemBalancingConfig, itemBalancingLibrary]);

    return stats;
}

function calculateEffectiveDps(stats: AggregatedStats): number {
    const cappedCritChance = Math.min(stats.criticalChance, 1);
    const cappedDoubleDamageChance = Math.min(stats.doubleDamageChance, 1);
    const critMultiplier = 1 + cappedCritChance * (stats.criticalDamage - 1);
    const doubleDmgMultiplier = 1 + cappedDoubleDamageChance;
    const baseCycleTime = stats.weaponWindupTime + stats.weaponAttackDuration;
    const modifiedCycleTime = baseCycleTime / stats.attackSpeedMultiplier;
    const attacksPerSecond = modifiedCycleTime > 0 ? 1 / modifiedCycleTime : 0;
    const weaponDps = stats.totalDamage * attacksPerSecond * critMultiplier * doubleDmgMultiplier;
    return weaponDps;
}

function calculateEffectiveHps(stats: AggregatedStats): number {
    const regenHps = stats.totalHealth * stats.healthRegen;
    const lifestealHps = calculateEffectiveDps(stats) * stats.lifeSteal;
    return regenHps + lifestealHps;
}

function calculateEffectiveHp(stats: AggregatedStats): number {
    const cappedBlockChance = Math.min(stats.blockChance, 0.95);
    return stats.totalHealth / (1 - cappedBlockChance);
}

type PriorityResult = {
    statKey: PriorityStatKey;
    stat: string;
    gainPercent: number;
};

type PriorityStatKey =
    | 'MeleeDMG'
    | 'AtkSpeed'
    | 'Double'
    | 'SkillDMG'
    | 'Lifesteal'
    | 'HP'
    | 'DMG'
    | 'RangedDMG'
    | 'Crit%'
    | 'CritDMG'
    | 'SkillCD'
    | 'Regen'
    | 'Block';

const PRIORITY_MAX_ROLLS: Record<PriorityStatKey, number> = {
    MeleeDMG: 50,
    AtkSpeed: 40,
    Double: 40,
    SkillDMG: 30,
    Lifesteal: 20,
    HP: 15,
    DMG: 15,
    RangedDMG: 15,
    'Crit%': 12,
    CritDMG: 100,
    SkillCD: 7,
    Regen: 6,
    Block: 5,
};

const PRIORITY_LABELS: Record<PriorityStatKey, string> = {
    MeleeDMG: 'Melee DMG',
    AtkSpeed: 'Atk Speed',
    Double: 'Double',
    SkillDMG: 'Skill DMG',
    Lifesteal: 'Lifesteal',
    HP: 'HP',
    DMG: 'DMG',
    RangedDMG: 'Ranged DMG',
    'Crit%': 'Crit %',
    CritDMG: 'Crit DMG',
    SkillCD: 'Skill CD',
    Regen: 'Regen',
    Block: 'Block',
};

const PRIORITY_KEYS: PriorityStatKey[] = [
    'MeleeDMG',
    'AtkSpeed',
    'Double',
    'SkillDMG',
    'Lifesteal',
    'HP',
    'DMG',
    'RangedDMG',
    'Crit%',
    'CritDMG',
    'SkillCD',
    'Regen',
    'Block',
];

const PRIORITY_STAT_IDS: Record<PriorityStatKey, string> = {
    MeleeDMG: 'MeleeDamageMulti',
    AtkSpeed: 'AttackSpeed',
    Double: 'DoubleDamageChance',
    SkillDMG: 'SkillDamageMulti',
    Lifesteal: 'LifeSteal',
    HP: 'HealthMulti',
    DMG: 'DamageMulti',
    RangedDMG: 'RangedDamageMulti',
    'Crit%': 'CriticalChance',
    CritDMG: 'CriticalMulti',
    SkillCD: 'SkillCooldownMulti',
    Regen: 'HealthRegen',
    Block: 'BlockChance',
};

type SecondaryStatEntry = {
    statId: string;
    value: number;
};

type PairedObject = {
    id: string;
    label: string;
    secondaryStats: SecondaryStatEntry[];
};

type PowerWeights = {
    offense: number;
    sustain: number;
};

function calculateCleanDps(stats: AggregatedStats): number {
    return calculateEffectiveDps(stats);
}

function calculateEffectivePower(stats: AggregatedStats, weights: PowerWeights): number {
    const cleanDps = calculateCleanDps(stats);
    const sustain = (stats.totalHealth * stats.healthRegen) + (cleanDps * stats.lifeSteal);
    const cappedBlockChance = Math.min(stats.blockChance, 0.95);
    const sustainBoost = sustain / Math.max(1 - cappedBlockChance, 0.05);
    return (cleanDps * weights.offense) + stats.totalHealth + (sustainBoost * weights.sustain);
}

function applySecondaryDelta(stats: AggregatedStats, statId: string, delta: number): AggregatedStats {
    if (delta === 0) return stats;

    switch (statId) {
        case 'DamageMulti': {
            const nextDamageMultiplier = Math.max(0, stats.damageMultiplier + delta);
            const ratio = stats.damageMultiplier > 0 ? nextDamageMultiplier / stats.damageMultiplier : 1;
            return {
                ...stats,
                damageMultiplier: nextDamageMultiplier,
                secondaryDamageMulti: stats.secondaryDamageMulti + delta,
                totalDamage: stats.totalDamage * ratio,
                meleeDamage: stats.meleeDamage * ratio,
                rangedDamage: stats.rangedDamage * ratio,
            };
        }
        case 'HealthMulti': {
            const nextHealthMultiplier = Math.max(0, stats.healthMultiplier + delta);
            const ratio = stats.healthMultiplier > 0 ? nextHealthMultiplier / stats.healthMultiplier : 1;
            return {
                ...stats,
                healthMultiplier: nextHealthMultiplier,
                secondaryHealthMulti: stats.secondaryHealthMulti + delta,
                totalHealth: stats.totalHealth * ratio,
            };
        }
        case 'MeleeDamageMulti': {
            const prevSpec = 1 + stats.meleeDamageMultiplier;
            const nextSpec = Math.max(0, prevSpec + delta);
            const ratio = prevSpec > 0 ? nextSpec / prevSpec : 1;
            if (stats.isRangedWeapon) {
                return {
                    ...stats,
                    meleeDamageMultiplier: stats.meleeDamageMultiplier + delta,
                };
            }
            return {
                ...stats,
                meleeDamageMultiplier: stats.meleeDamageMultiplier + delta,
                totalDamage: stats.totalDamage * ratio,
                meleeDamage: stats.meleeDamage * ratio,
            };
        }
        case 'RangedDamageMulti': {
            const prevSpec = 1 + stats.rangedDamageMultiplier;
            const nextSpec = Math.max(0, prevSpec + delta);
            const ratio = prevSpec > 0 ? nextSpec / prevSpec : 1;
            if (!stats.isRangedWeapon) {
                return {
                    ...stats,
                    rangedDamageMultiplier: stats.rangedDamageMultiplier + delta,
                };
            }
            return {
                ...stats,
                rangedDamageMultiplier: stats.rangedDamageMultiplier + delta,
                totalDamage: stats.totalDamage * ratio,
                rangedDamage: stats.rangedDamage * ratio,
            };
        }
        case 'AttackSpeed':
            return { ...stats, attackSpeedMultiplier: stats.attackSpeedMultiplier + delta };
        case 'CriticalChance':
            return { ...stats, criticalChance: stats.criticalChance + delta };
        case 'CriticalMulti':
            return { ...stats, criticalDamage: stats.criticalDamage + delta };
        case 'DoubleDamageChance':
            return { ...stats, doubleDamageChance: stats.doubleDamageChance + delta };
        case 'LifeSteal':
            return { ...stats, lifeSteal: stats.lifeSteal + delta };
        case 'HealthRegen':
            return { ...stats, healthRegen: stats.healthRegen + delta };
        case 'BlockChance':
            return { ...stats, blockChance: stats.blockChance + delta };
        case 'SkillCooldownMulti':
            return { ...stats, skillCooldownReduction: stats.skillCooldownReduction + delta };
        case 'SkillDamageMulti':
            return { ...stats, skillDamageMultiplier: stats.skillDamageMultiplier + delta };
        default:
            return stats;
    }
}

function applySecondaryStats(stats: AggregatedStats, entries: SecondaryStatEntry[], direction: 1 | -1): AggregatedStats {
    return entries.reduce((acc, entry) => {
        const delta = (entry.value / 100) * direction;
        return applySecondaryDelta(acc, entry.statId, delta);
    }, stats);
}

function collectPairedItems(profile: UserProfile): PairedObject[] {
    const objects: PairedObject[] = [];

    for (const [slotKey, item] of Object.entries(profile.items)) {
        if (!item?.secondaryStats?.length) continue;
        objects.push({
            id: `item-${slotKey}`,
            label: slotKey,
            secondaryStats: item.secondaryStats.slice(0, 2),
        });
    }

    return objects;
}

function collectPairedPets(profile: UserProfile): PairedObject[] {
    const objects: PairedObject[] = [];

    profile.pets.active.forEach((pet, index) => {
        if (!pet.secondaryStats?.length) return;
        const label = pet.customName
            ? `Pet ${pet.customName}`
            : `Pet ${index + 1} ${pet.rarity} ${pet.id}`;
        objects.push({
            id: `pet-${index}`,
            label,
            secondaryStats: pet.secondaryStats.slice(0, 2),
        });
    });

    return objects;
}

function buildSimulatedSecondaryStats(replacements: PriorityResult[], slotCount: number): SecondaryStatEntry[] {
    const entries: SecondaryStatEntry[] = [];
    const topStats = replacements.slice(0, slotCount);

    for (const entry of topStats) {
        const statId = PRIORITY_STAT_IDS[entry.statKey];
        const value = PRIORITY_MAX_ROLLS[entry.statKey] * 0.75;
        entries.push({ statId, value });
    }

    return entries;
}

export default function StatCalculator() {
    const base = useProfile();
    const [showGuide, setShowGuide] = useState(false);
    const [sandboxProfile, setSandboxProfile] = useState<UserProfile>(() => cloneProfile(base.profile));
    const [baselineProfile, setBaselineProfile] = useState<UserProfile>(() => cloneProfile(base.profile));
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [weakestItemLabel, setWeakestItemLabel] = useState<string>('');
    const [weakestItemId, setWeakestItemId] = useState<string>('');
    const [weakestItemStats, setWeakestItemStats] = useState<SecondaryStatEntry[] | null>(null);
    const [weakestPetLabel, setWeakestPetLabel] = useState<string>('');
    const [weakestPetId, setWeakestPetId] = useState<string>('');
    const [weakestPetStats, setWeakestPetStats] = useState<SecondaryStatEntry[] | null>(null);
    const [itemReplacementList, setItemReplacementList] = useState<PriorityResult[]>([]);
    const [petReplacementList, setPetReplacementList] = useState<PriorityResult[]>([]);
    const [itemSwapGain, setItemSwapGain] = useState<number | null>(null);
    const [petSwapGain, setPetSwapGain] = useState<number | null>(null);
    const [itemNetPowerDelta, setItemNetPowerDelta] = useState<number | null>(null);
    const [petNetPowerDelta, setPetNetPowerDelta] = useState<number | null>(null);
    const [itemOffensePercent, setItemOffensePercent] = useState<number | null>(null);
    const [itemSustainPercent, setItemSustainPercent] = useState<number | null>(null);
    const [petOffensePercent, setPetOffensePercent] = useState<number | null>(null);
    const [petSustainPercent, setPetSustainPercent] = useState<number | null>(null);
    const [powerWeights, setPowerWeights] = useState<PowerWeights>({ offense: 1, sustain: 1 });
    const [simulatedItemOverride, setSimulatedItemOverride] = useState<{
        slotKey: keyof UserProfile['items'];
        secondaryStats: SecondaryStatEntry[];
    } | null>(null);
    const [simulatedPetOverride, setSimulatedPetOverride] = useState<{
        petIndex: number;
        secondaryStats: SecondaryStatEntry[];
    } | null>(null);

    useEffect(() => {
        setSandboxProfile(cloneProfile(base.profile));
        setBaselineProfile(cloneProfile(base.profile));
        setHasUnsavedChanges(false);
        setSimulatedItemOverride(null);
        setSimulatedPetOverride(null);
    }, [base.profile.id]);

    const updateSandboxProfile = useCallback((updates: Partial<UserProfile>) => {
        setSandboxProfile(prev => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
        setSimulatedItemOverride(null);
        setSimulatedPetOverride(null);
    }, []);

    const updateSandboxNestedProfile = useCallback((section: keyof UserProfile, data: any) => {
        setSandboxProfile(prev => {
            const sectionValue = prev[section];
            if (typeof sectionValue === 'object' && sectionValue !== null) {
                return { ...prev, [section]: { ...sectionValue, ...data } };
            }
            return { ...prev, [section]: data };
        });
        setHasUnsavedChanges(true);
        setSimulatedItemOverride(null);
        setSimulatedPetOverride(null);
    }, []);

    const displayProfile = useMemo(() => {
        const hasItemOverride = !!simulatedItemOverride;
        const hasPetOverride = !!simulatedPetOverride;
        if (!hasItemOverride && !hasPetOverride) return sandboxProfile;

        let nextProfile = sandboxProfile;

        if (simulatedItemOverride) {
            const { slotKey, secondaryStats } = simulatedItemOverride;
            const item = nextProfile.items[slotKey];
            if (item) {
                nextProfile = {
                    ...nextProfile,
                    items: {
                        ...nextProfile.items,
                        [slotKey]: {
                            ...item,
                            secondaryStats,
                        },
                    },
                };
            }
        }

        if (simulatedPetOverride) {
            const { petIndex, secondaryStats } = simulatedPetOverride;
            const pet = nextProfile.pets.active[petIndex];
            if (pet) {
                const updatedPets = [...nextProfile.pets.active];
                updatedPets[petIndex] = {
                    ...pet,
                    secondaryStats,
                };
                nextProfile = {
                    ...nextProfile,
                    pets: {
                        ...nextProfile.pets,
                        active: updatedPets,
                    },
                };
            }
        }

        return nextProfile;
    }, [sandboxProfile, simulatedItemOverride, simulatedPetOverride]);

    const sandboxContext = useMemo(() => ({
        ...base,
        profile: displayProfile,
        updateProfile: updateSandboxProfile,
        updateNestedProfile: updateSandboxNestedProfile,
    }), [base, displayProfile, updateSandboxProfile, updateSandboxNestedProfile]);

    const sandboxStats = useStatsForProfile(displayProfile);
    const currentSandboxStats = useStatsForProfile(sandboxProfile);
    const baselineStats = useStatsForProfile(baselineProfile);

    const handleApplyToProfile = () => {
        base.updateProfile({
            items: sandboxProfile.items,
            pets: sandboxProfile.pets,
            mount: sandboxProfile.mount,
        });
        setBaselineProfile(cloneProfile(sandboxProfile));
        setHasUnsavedChanges(false);
    };

    const handleDiscardChanges = () => {
        setSandboxProfile(cloneProfile(base.profile));
        setHasUnsavedChanges(false);
    };

    const handleSetBaseline = () => {
        setBaselineProfile(cloneProfile(sandboxProfile));
    };

    const currentDps = sandboxStats ? calculateEffectiveDps(sandboxStats) : 0;
    const currentHps = sandboxStats ? calculateEffectiveHps(sandboxStats) : 0;
    const currentEhp = sandboxStats ? calculateEffectiveHp(sandboxStats) : 0;
    const currentRecRate = currentEhp > 0 ? (currentHps / currentEhp) * 100 : 0;

    const baselineDps = baselineStats ? calculateEffectiveDps(baselineStats) : 0;
    const baselineHps = baselineStats ? calculateEffectiveHps(baselineStats) : 0;
    const baselineEhp = baselineStats ? calculateEffectiveHp(baselineStats) : 0;
    const baselineRecRate = baselineEhp > 0 ? (baselineHps / baselineEhp) * 100 : 0;
    const offenseDeltaPercent = baselineDps > 0 ? ((currentDps - baselineDps) / baselineDps) * 100 : 0;

    const runPriorityAnalysis = useCallback(() => {
        if (!currentSandboxStats) {
            setWeakestItemLabel('');
            setWeakestItemId('');
            setWeakestItemStats(null);
            setWeakestPetLabel('');
            setWeakestPetId('');
            setWeakestPetStats(null);
            setItemReplacementList([]);
            setPetReplacementList([]);
            setItemSwapGain(null);
            setPetSwapGain(null);
            setItemNetPowerDelta(null);
            setPetNetPowerDelta(null);
            setItemOffensePercent(null);
            setItemSustainPercent(null);
            setPetOffensePercent(null);
            setPetSustainPercent(null);
            setSimulatedItemOverride(null);
            setSimulatedPetOverride(null);
            return;
        }

        const basePower = calculateEffectivePower(currentSandboxStats, powerWeights);
        setItemSwapGain(null);
        setPetSwapGain(null);
        setItemNetPowerDelta(null);
        setPetNetPowerDelta(null);
        setItemOffensePercent(null);
        setItemSustainPercent(null);
        setPetOffensePercent(null);
        setPetSustainPercent(null);
        setSimulatedItemOverride(null);
        setSimulatedPetOverride(null);
        const items = collectPairedItems(sandboxProfile);
        const pets = collectPairedPets(sandboxProfile);

        if (items.length > 0) {
            let weakestRemovalStats = currentSandboxStats;
            let powerAfterRemoval = Number.NEGATIVE_INFINITY;
            let weakestLabel = '';
            let weakestId = '';
            let weakestStats: SecondaryStatEntry[] | null = null;

            for (const object of items) {
                const removedStats = applySecondaryStats(currentSandboxStats, object.secondaryStats, -1);
                const removedPower = calculateEffectivePower(removedStats, powerWeights);
                if (removedPower >= powerAfterRemoval) {
                    weakestRemovalStats = removedStats;
                    powerAfterRemoval = removedPower;
                    weakestLabel = object.label;
                    weakestId = object.id;
                    weakestStats = object.secondaryStats;
                }
            }

            const itemResults: PriorityResult[] = [];
            for (const key of PRIORITY_KEYS) {
                const statId = PRIORITY_STAT_IDS[key];
                const delta = (PRIORITY_MAX_ROLLS[key] * 0.5) / 100;
                const simulatedStats = applySecondaryDelta(weakestRemovalStats, statId, delta);
                const simulatedPower = calculateEffectivePower(simulatedStats, powerWeights);
                const gainPercent = basePower > 0
                    ? ((simulatedPower - powerAfterRemoval) / basePower) * 100
                    : 0;
                itemResults.push({ statKey: key, stat: PRIORITY_LABELS[key], gainPercent });
            }

            itemResults.sort((a, b) => b.gainPercent - a.gainPercent);

            setWeakestItemLabel(weakestLabel);
            setWeakestItemId(weakestId);
            setWeakestItemStats(weakestStats);
            setItemReplacementList(itemResults.slice(0, 6));
        } else {
            setWeakestItemLabel('');
            setWeakestItemId('');
            setWeakestItemStats(null);
            setItemReplacementList([]);
        }

        if (pets.length > 0) {
            let weakestRemovalStats = currentSandboxStats;
            let powerAfterRemoval = Number.NEGATIVE_INFINITY;
            let weakestLabel = '';
            let weakestId = '';
            let weakestStats: SecondaryStatEntry[] | null = null;

            for (const object of pets) {
                const removedStats = applySecondaryStats(currentSandboxStats, object.secondaryStats, -1);
                const removedPower = calculateEffectivePower(removedStats, powerWeights);
                if (removedPower >= powerAfterRemoval) {
                    weakestRemovalStats = removedStats;
                    powerAfterRemoval = removedPower;
                    weakestLabel = object.label;
                    weakestId = object.id;
                    weakestStats = object.secondaryStats;
                }
            }

            const petResults: PriorityResult[] = [];
            for (const key of PRIORITY_KEYS) {
                const statId = PRIORITY_STAT_IDS[key];
                const delta = (PRIORITY_MAX_ROLLS[key] * 0.5) / 100;
                const simulatedStats = applySecondaryDelta(weakestRemovalStats, statId, delta);
                const simulatedPower = calculateEffectivePower(simulatedStats, powerWeights);
                const gainPercent = basePower > 0
                    ? ((simulatedPower - powerAfterRemoval) / basePower) * 100
                    : 0;
                petResults.push({ statKey: key, stat: PRIORITY_LABELS[key], gainPercent });
            }

            petResults.sort((a, b) => b.gainPercent - a.gainPercent);

            setWeakestPetLabel(weakestLabel);
            setWeakestPetId(weakestId);
            setWeakestPetStats(weakestStats);
            setPetReplacementList(petResults.slice(0, 6));
        } else {
            setWeakestPetLabel('');
            setWeakestPetId('');
            setWeakestPetStats(null);
            setPetReplacementList([]);
        }
    }, [sandboxProfile, currentSandboxStats, powerWeights]);

    const simulateItemReplacement = useCallback(() => {
        if (!weakestItemId || itemReplacementList.length === 0 || !weakestItemStats) return;
        const slotKey = weakestItemId.replace('item-', '') as keyof UserProfile['items'];
        if (!(slotKey in sandboxProfile.items)) return;

        const slotCount = Math.max(1, Math.min(2, weakestItemStats.length));
        const simulatedSecondaryStats = buildSimulatedSecondaryStats(itemReplacementList, slotCount);

        setSimulatedItemOverride({
            slotKey,
            secondaryStats: simulatedSecondaryStats,
        });
    }, [itemReplacementList, sandboxProfile.items, weakestItemId, weakestItemStats]);

    const simulatePetReplacement = useCallback(() => {
        if (!weakestPetId || petReplacementList.length === 0 || !weakestPetStats) return;
        const petIndex = Number(weakestPetId.replace('pet-', ''));
        if (!Number.isFinite(petIndex)) return;
        if (!sandboxProfile.pets.active[petIndex]) return;

        const slotCount = Math.max(1, Math.min(2, weakestPetStats.length));
        const simulatedSecondaryStats = buildSimulatedSecondaryStats(petReplacementList, slotCount);

        setSimulatedPetOverride({
            petIndex,
            secondaryStats: simulatedSecondaryStats,
        });
    }, [petReplacementList, sandboxProfile.pets.active, weakestPetId, weakestPetStats]);

    const simulateTopReplacement = useCallback((type: 'item' | 'pet') => {
        if (!currentSandboxStats) return;

        const basePower = calculateEffectivePower(currentSandboxStats, powerWeights);
        const weakestStats = type === 'item' ? weakestItemStats : weakestPetStats;
        const replacementList = type === 'item' ? itemReplacementList : petReplacementList;

        if (!weakestStats || replacementList.length === 0) {
            if (type === 'item') {
                setItemSwapGain(null);
                setItemNetPowerDelta(null);
            } else {
                setPetSwapGain(null);
                setPetNetPowerDelta(null);
            }
            return;
        }

        const removedStats = applySecondaryStats(currentSandboxStats, weakestStats, -1);
        const powerAfterRemoval = calculateEffectivePower(removedStats, powerWeights);
        const slotsToFill = weakestStats.length >= 2 ? 2 : 1;
        const topStats = replacementList.slice(0, slotsToFill);

        let simulatedStats = removedStats;
        for (const entry of topStats) {
            const statId = PRIORITY_STAT_IDS[entry.statKey];
            const delta = (PRIORITY_MAX_ROLLS[entry.statKey] * 0.75) / 100;
            simulatedStats = applySecondaryDelta(simulatedStats, statId, delta);
        }

        const simulatedPower = calculateEffectivePower(simulatedStats, powerWeights);
        const gainPercent = basePower > 0
            ? ((simulatedPower - powerAfterRemoval) / basePower) * 100
            : 0;
        const netPowerDelta = ((simulatedPower - basePower) / basePower) * 100;

        // Calculate offense and sustain deltas - compare simulated against current sandbox (without overrides)
        const baselineDps = calculateEffectiveDps(currentSandboxStats);
        const simulatedDps = calculateEffectiveDps(simulatedStats);
        const offenseDelta = baselineDps > 0 ? ((simulatedDps - baselineDps) / baselineDps) * 100 : 0;

        const baselineHps = calculateEffectiveHps(currentSandboxStats);
        const simulatedHps = calculateEffectiveHps(simulatedStats);
        const baselineEhp = calculateEffectiveHp(currentSandboxStats);
        const simulatedEhp = calculateEffectiveHp(simulatedStats);
        const baselineRecRate = baselineEhp > 0 ? (baselineHps / baselineEhp) * 100 : 0;
        const simulatedRecRate = simulatedEhp > 0 ? (simulatedHps / simulatedEhp) * 100 : 0;
        const sustainDelta = simulatedRecRate - baselineRecRate;

        if (type === 'item') {
            setItemSwapGain(gainPercent);
            setItemNetPowerDelta(netPowerDelta);
            setItemOffensePercent(offenseDelta);
            setItemSustainPercent(sustainDelta);
        } else {
            setPetSwapGain(gainPercent);
            setPetNetPowerDelta(netPowerDelta);
            setPetOffensePercent(offenseDelta);
            setPetSustainPercent(sustainDelta);
        }
    }, [itemReplacementList, petReplacementList, powerWeights, currentSandboxStats, weakestItemStats, weakestPetStats]);

    const highlightedSlotKey = useMemo(() => {
        if (!weakestItemId.startsWith('item-')) return null;
        const slot = weakestItemId.replace('item-', '') as keyof UserProfile['items'];
        return slot in sandboxProfile.items ? slot : null;
    }, [sandboxProfile.items, weakestItemId]);

    const highlightedPetIndex = useMemo(() => {
        if (!weakestPetId.startsWith('pet-')) return null;
        const index = Number(weakestPetId.replace('pet-', ''));
        return Number.isFinite(index) ? index : null;
    }, [weakestPetId]);

    // Recalculate simulation deltas when percentage changes
    useEffect(() => {
        if (itemSwapGain !== null) {
            simulateTopReplacement('item');
        }
        if (petSwapGain !== null) {
            simulateTopReplacement('pet');
        }
    }, [simulateTopReplacement]);

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto">
            <div className="text-center space-y-2 mb-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent inline-flex items-center gap-3">
                    <Calculator className="w-8 h-8" />
                    Stat Optimizer
                </h1>
                <p className="text-text-secondary">Calculate your stats and optimize your build using your current equipment, mount, and pets.</p>
                <div className="flex justify-center gap-4 pt-4">
                    <Button onClick={() => setShowGuide(true)} variant="ghost" size="sm">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Guide
                    </Button>
                </div>
            </div>

            <Card className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-text-secondary">
                        {hasUnsavedChanges ? 'You have unsaved changes in the calculator.' : 'All changes are synced with your profile.'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={handleSetBaseline}>
                            Set Baseline
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDiscardChanges} disabled={!hasUnsavedChanges}>
                            Discard Changes
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleApplyToProfile} disabled={!hasUnsavedChanges}>
                            Apply to Profile
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-bg-input/30 rounded-lg border border-border/30 p-3">
                        <div className="text-xs text-text-muted uppercase">Offense</div>
                        <div className="text-lg font-bold text-accent-primary">{Math.round(currentDps).toLocaleString()}</div>
                        <div className={offenseDeltaPercent >= 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                            {offenseDeltaPercent >= 0 ? '+' : ''}{offenseDeltaPercent.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-bg-input/30 rounded-lg border border-border/30 p-3">
                        <div className="text-xs text-text-muted uppercase">Recovery Rate</div>
                        <div className="text-lg font-bold text-green-400">{currentRecRate.toFixed(1)}%</div>
                        <div className={currentRecRate - baselineRecRate >= 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                            {currentRecRate - baselineRecRate >= 0 ? '+' : ''}{(currentRecRate - baselineRecRate).toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-bg-input/30 rounded-lg border border-border/30 p-3">
                        <div className="text-xs text-text-muted uppercase">One-Shot Limit</div>
                        <div className="text-lg font-bold text-sky-400">{Math.round(currentEhp).toLocaleString()}</div>
                        <div className={currentEhp - baselineEhp >= 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                            {currentEhp - baselineEhp >= 0 ? '+' : ''}{Math.round(currentEhp - baselineEhp).toLocaleString()}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-text-primary">Stat Priority Analysis</div>
                        <div className="text-xs text-text-secondary">Object Replacement Value (replacing weakest paired item or pet).</div>
                        
                        <div className="mt-4 rounded-lg border border-border/30 bg-bg-input/20 p-3 space-y-3">
                            <div>
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="font-semibold text-text-secondary">Stat Priority Focus</span>
                                    <span className="text-text-muted">Adjust offense vs sustain importance</span>
                                </div>
                                <div className="flex items-center gap-3 px-1">
                                    <span className="text-xs text-text-muted whitespace-nowrap">Sustain</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={(powerWeights.offense / (powerWeights.offense + powerWeights.sustain)) * 100}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (value === 50) {
                                                // 1:1 balanced point
                                                setPowerWeights({ offense: 1, sustain: 1 });
                                            } else {
                                                const offenseRatio = value / 100;
                                                const sustainRatio = 1 - offenseRatio;
                                                // Scale from 0.5x to 2x for more impact
                                                const offense = 0.5 + (offenseRatio * 1.5);
                                                const sustain = 0.5 + (sustainRatio * 1.5);
                                                setPowerWeights({ offense, sustain });
                                            }
                                        }}
                                        className="flex-1 h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs text-text-muted whitespace-nowrap">Offense</span>
                                </div>
                                <div className="text-xs text-text-muted mt-2 text-center">
                                    {Math.abs(powerWeights.offense - powerWeights.sustain) < 0.01 ? (
                                        <span className="text-accent-primary font-semibold">⚖️ Balanced (1:1)</span>
                                    ) : (
                                        <span>Sustain {powerWeights.sustain.toFixed(1)}x  •  Offense {powerWeights.offense.toFixed(1)}x</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={runPriorityAnalysis} disabled={!sandboxStats}>
                        Run Analysis
                    </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-bg-input/30 rounded-lg border border-border/30 p-4 space-y-3">
                        <div>
                            <div className="text-xs text-text-muted uppercase font-semibold tracking-wide">Weakest Item</div>
                            {weakestItemLabel ? (
                                <div className="text-base font-semibold text-text-primary mt-1">{weakestItemLabel}</div>
                            ) : (
                                <div className="text-sm text-text-muted italic mt-1">No item with paired stats found.</div>
                            )}
                        </div>

                        {itemReplacementList.length > 0 ? (
                            <div className="space-y-1">
                                {itemReplacementList.map((entry, index) => (
                                    <div key={`${entry.stat}-${index}`} className="flex items-center justify-between text-sm">
                                        <span className="text-text-secondary">{index + 1}. {entry.stat}</span>
                                        <span className="font-semibold text-accent-primary">+{entry.gainPercent.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    simulateTopReplacement('item');
                                    simulateItemReplacement();
                                }}
                                disabled={itemReplacementList.length === 0}
                            >
                                Simulate Top 2 @ 75%
                            </Button>
                            {itemSwapGain !== null && itemNetPowerDelta !== null && itemOffensePercent !== null && itemSustainPercent !== null && (
                                <div className="rounded-lg bg-bg-primary/40 border border-border/20 p-3 space-y-2">
                                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Simulation Results</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-0.5">
                                            <div className="text-xs text-text-muted">Offense</div>
                                            <div className={itemOffensePercent >= 0 ? 'text-lg font-bold text-accent-primary' : 'text-lg font-bold text-red-500'}>
                                                {itemOffensePercent >= 0 ? '+' : ''}{itemOffensePercent.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs text-text-muted">Sustain</div>
                                            <div className={itemSustainPercent >= 0 ? 'text-lg font-bold text-accent-primary' : 'text-lg font-bold text-red-500'}>
                                                {itemSustainPercent >= 0 ? '+' : ''}{itemSustainPercent.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-border/20 pt-2">
                                        <div className="text-xs text-text-muted mb-1">Net Power</div>
                                        <div className={itemNetPowerDelta >= 0 ? 'text-xl font-bold text-accent-primary' : 'text-xl font-bold text-orange-500'}>
                                            {itemNetPowerDelta >= 0 ? '+' : ''}{itemNetPowerDelta.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            )}
                            {simulatedItemOverride ? (
                                <div className="rounded-lg border border-border/40 bg-bg-input/40 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-semibold text-text-secondary uppercase">Simulated Item</div>
                                        <Button variant="ghost" size="sm" onClick={() => setSimulatedItemOverride(null)}>
                                            Clear
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {simulatedItemOverride.secondaryStats.map((stat, index) => {
                                            const formatted = formatSecondaryStat(stat.statId, stat.value);
                                            return (
                                                <span key={`${stat.statId}-${index}`} className="rounded bg-bg-primary/60 px-2 py-0.5 text-xs">
                                                    {formatted.name}: {formatted.formattedValue}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="bg-bg-input/30 rounded-lg border border-border/30 p-4 space-y-3">
                        <div>
                            <div className="text-xs text-text-muted uppercase font-semibold tracking-wide">Weakest Pet</div>
                            {weakestPetLabel ? (
                                <div className="text-base font-semibold text-text-primary mt-1">{weakestPetLabel}</div>
                            ) : (
                                <div className="text-sm text-text-muted italic mt-1">No pet with paired stats found.</div>
                            )}
                        </div>

                        {petReplacementList.length > 0 ? (
                            <div className="space-y-1">
                                {petReplacementList.map((entry, index) => (
                                    <div key={`${entry.stat}-${index}`} className="flex items-center justify-between text-sm">
                                        <span className="text-text-secondary">{index + 1}. {entry.stat}</span>
                                        <span className="font-semibold text-accent-primary">+{entry.gainPercent.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    simulateTopReplacement('pet');
                                    simulatePetReplacement();
                                }}
                                disabled={petReplacementList.length === 0}
                            >
                                Simulate Top 2 @ 75%
                            </Button>
                            {petSwapGain !== null && petNetPowerDelta !== null && petOffensePercent !== null && petSustainPercent !== null && (
                                <div className="rounded-lg bg-bg-primary/40 border border-border/20 p-3 space-y-2">
                                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Simulation Results</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-0.5">
                                            <div className="text-xs text-text-muted">Offense</div>
                                            <div className={petOffensePercent >= 0 ? 'text-lg font-bold text-accent-primary' : 'text-lg font-bold text-red-500'}>
                                                {petOffensePercent >= 0 ? '+' : ''}{petOffensePercent.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs text-text-muted">Sustain</div>
                                            <div className={petSustainPercent >= 0 ? 'text-lg font-bold text-accent-primary' : 'text-lg font-bold text-red-500'}>
                                                {petSustainPercent >= 0 ? '+' : ''}{petSustainPercent.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-border/20 pt-2">
                                        <div className="text-xs text-text-muted mb-1">Net Power</div>
                                        <div className={petNetPowerDelta >= 0 ? 'text-xl font-bold text-accent-primary' : 'text-xl font-bold text-orange-500'}>
                                            {petNetPowerDelta >= 0 ? '+' : ''}{petNetPowerDelta.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            )}
                            {simulatedPetOverride ? (
                                <div className="rounded-lg border border-border/40 bg-bg-input/40 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-semibold text-text-secondary uppercase">Simulated Pet</div>
                                        <Button variant="ghost" size="sm" onClick={() => setSimulatedPetOverride(null)}>
                                            Clear
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {simulatedPetOverride.secondaryStats.map((stat, index) => {
                                            const formatted = formatSecondaryStat(stat.statId, stat.value);
                                            return (
                                                <span key={`${stat.statId}-${index}`} className="rounded bg-bg-primary/60 px-2 py-0.5 text-xs">
                                                    {formatted.name}: {formatted.formattedValue}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Equipment, Mount, Pets panels (calculator sandbox) */}
            <ProfileContext.Provider value={sandboxContext}>
                <EquipmentPanel highlightedSlotKey={highlightedSlotKey} />
                <PetPanel highlightedPetIndex={highlightedPetIndex} />
            </ProfileContext.Provider>

            {/* Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl max-h-[80vh] overflow-y-auto bg-bg-primary border border-border shadow-2xl">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                User Guide
                                <Button
                                    onClick={() => setShowGuide(false)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 rounded-full border border-border bg-bg-input text-text-primary hover:bg-bg-secondary hover:text-white"
                                    aria-label="Close guide"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <p><strong className="text-accent-primary">⚔️ Offense Score:</strong> Your effective DPS. Crit Damage and Double Chance are factored in as average multipliers.</p>
                            <p><strong className="text-accent-primary">🛡️ Recovery Rate (Sustain):</strong> Percentage of your effective HP recovered per second via Regen, Lifesteal, and skills.</p>
                            <p><strong className="text-accent-primary">🛡️ One-Shot Limit:</strong> Your effective HP after block, used as a safety margin against fatal hits.</p>
                            <p><strong className="text-accent-primary">📍 Baseline:</strong> Set Baseline to capture your current build as a comparison point.</p>
                            <p><strong className="text-accent-primary">✅ Apply Changes:</strong> Changes made here stay in the calculator until you apply them to your profile.</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
