
// --- Battle Types ---

export interface DungeonLevelConfig {
    Level: number;
    Health: number;
    Damage: number;
    Wave1?: number;
    Wave2?: number;
    Wave3?: number;
    EnemyId1?: number;
    EnemyId2?: number;
}

export interface WaveResult {
    waveIndex: number;
    enemies: { id: number; count: number; damagePerHit: number; isRanged: boolean }[];
    totalEnemyHp: number;
    totalEnemyDps: number;
    playerHealthBeforeWave: number;
    playerHealthAfterWave: number;
    survived: boolean;
    timeToComplete: number;
}

export interface BattleResult {
    ageIdx?: number;
    battleIdx?: number;
    difficultyIdx: number;
    dungeonLevel?: number;
    dungeonType?: string;
    waves: WaveResult[];
    victory: boolean;
    winProbability: number; // 0-100%
    totalRuns: number;
    playerHealthRemaining: number;
    totalTime: number;
    totalEnemyHp?: number;
    totalEnemyDps?: number;
    playerStats: {
        effectiveDps: number;
        effectiveHp: number;
        healingPerSecond: number;
        damagePerHit: number; // Single hit damage
    };
}

export interface BattleConfig {
    DifficultyIdx: number;
    AgeIdx: number;
    BattleIdx: number;
    EnvironmentId: number;
    Waves: {
        WaveIdx: number;
        Enemies: {
            Id: number; // Enemy ID
            Count: number;
        }[];
    }[];
}

export interface AgeScaling {
    AgeIdx: number;
    Damage: { Raw: number };
    Health: { Raw: number };
}

export interface WeaponInfo {
    Age: number;
    Idx: number;
    Type: string;
    AttackDuration: number;
    WindupTime: number;
    IsRanged: number;
    ProjectileId?: number;
    AttackRange?: number;
}

export interface LibraryData {
    mainBattleLibrary: Record<string, BattleConfig>;
    enemyAgeScalingLibrary: Record<string, AgeScaling>;
    enemyLibrary: Record<string, any>;
    weaponLibrary: Record<string, WeaponInfo>;
    mainBattleConfig: any;
    itemBalancingConfig?: any;
    projectilesLibrary: Record<string, any>;
    hammerThiefDungeonBattleLibrary: Record<string, DungeonLevelConfig>;
    skillDungeonBattleLibrary: Record<string, DungeonLevelConfig>;
    eggDungeonBattleLibrary: Record<string, DungeonLevelConfig>;
    potionDungeonBattleLibrary: Record<string, DungeonLevelConfig>;
    skillLibrary?: Record<string, any>;
    skillPassiveLibrary?: Record<string, any>;
    mainBattleLookup?: Record<string, BattleConfig>;
}

// --- Helper Functions ---

export function getAvailableStages(libs: LibraryData): { ageIdx: number; battleIdx: number }[] {
    if (!libs.mainBattleLibrary) return [];

    const stages: { ageIdx: number; battleIdx: number }[] = [];
    const keys = Object.keys(libs.mainBattleLibrary);

    keys.forEach(key => {
        const ageMatch = key.match(/'AgeIdx': (\d+)/);
        const battleMatch = key.match(/'BattleIdx': (\d+)/);
        if (ageMatch && battleMatch) {
            stages.push({
                ageIdx: parseInt(ageMatch[1]),
                battleIdx: parseInt(battleMatch[1])
            });
        }
    });

    return stages.sort((a, b) => {
        if (a.ageIdx !== b.ageIdx) return a.ageIdx - b.ageIdx;
        return a.battleIdx - b.battleIdx;
    });
}

export function calculateEnemyHp(
    _progressDifficultyIdx: number,
    ageScaling: AgeScaling,
    _mainBattleConfig: any,
    _weaponInfo: WeaponInfo | null,
    _libs: LibraryData
): number {
    const baseHp = ageScaling.Health.Raw;
    return baseHp;
}

export function calculateEnemyDmg(
    _progressDifficultyIdx: number,
    ageScaling: AgeScaling,
    _mainBattleConfig: any,
    weaponInfo: WeaponInfo | null,
    enemyRangedMulti: number,
    _libs: LibraryData
): number {
    const baseDmg = ageScaling.Damage.Raw;
    const atkRange = weaponInfo?.AttackRange ?? 0;
    if (weaponInfo && atkRange > 1.0) {
        return baseDmg * enemyRangedMulti;
    }
    return baseDmg;
}

export function calculateProgressDifficultyIdx(
    ageIdx: number,
    battleIdx: number,
    difficultyMode: number,
    mainBattleLibrary: Record<string, BattleConfig>
): number {
    let totalBattles = 0;

    for (let age = 0; age < ageIdx; age++) {
        const ageKey = `{'AgeIdx': ${age}`;
        const battlesInAge = Object.keys(mainBattleLibrary).filter(k => k.includes(ageKey)).length;
        totalBattles += battlesInAge;
    }

    totalBattles += battleIdx;

    const battlesPerMode = 300;
    totalBattles += (difficultyMode * battlesPerMode);

    return totalBattles;
}
