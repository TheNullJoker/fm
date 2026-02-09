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

export default function StatCalculator() {
    const base = useProfile();
    const [showGuide, setShowGuide] = useState(false);
    const [sandboxProfile, setSandboxProfile] = useState<UserProfile>(() => cloneProfile(base.profile));
    const [baselineProfile, setBaselineProfile] = useState<UserProfile>(() => cloneProfile(base.profile));
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        setSandboxProfile(cloneProfile(base.profile));
        setBaselineProfile(cloneProfile(base.profile));
        setHasUnsavedChanges(false);
    }, [base.profile.id]);

    const updateSandboxProfile = useCallback((updates: Partial<UserProfile>) => {
        setSandboxProfile(prev => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
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
    }, []);

    const sandboxContext = useMemo(() => ({
        ...base,
        profile: sandboxProfile,
        updateProfile: updateSandboxProfile,
        updateNestedProfile: updateSandboxNestedProfile,
    }), [base, sandboxProfile, updateSandboxProfile, updateSandboxNestedProfile]);

    const sandboxStats = useStatsForProfile(sandboxProfile);
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
                        <div className={currentDps - baselineDps >= 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                            {currentDps - baselineDps >= 0 ? '+' : ''}{Math.round(currentDps - baselineDps).toLocaleString()}
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

            {/* Equipment, Mount, Pets panels (calculator sandbox) */}
            <ProfileContext.Provider value={sandboxContext}>
                <EquipmentPanel />
                <PetPanel />
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
