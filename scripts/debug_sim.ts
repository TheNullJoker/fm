// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { calculateAllStats } from '../src/utils/statsCalculator';
import { simulateBattle, BattleResult, LibraryData } from '../src/utils/BattleSimulator';
import { UserProfile } from '../src/types/Profile';

// --- MOCK DATA ---
const mockProfile: UserProfile = {
    id: 'test',
    name: 'DebugUser',
    level: 100,
    items: {
        Weapon: { id: 1, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Helmet: { id: 2, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Body: { id: 3, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Gloves: { id: 4, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Belt: { id: 5, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Necklace: { id: 6, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Ring: { id: 7, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] },
        Shoe: { id: 8, rarity: 'Common', level: 100, age: 10, idx: 0, secondaryStats: [] }
    },
    pets: { active: [], unlocked: [] },
    skills: { equipped: [], unlocked: [] },
    mount: { active: null, unlocked: [] },
    techTree: { Forge: {}, Power: {}, SkillsPetTech: {} },
    dungeonProgress: { hammer: 0, skill: 0, egg: 0, potion: 0 },
    inventory: []
};

// --- LOAD CONFIGS ---
const configDir = path.resolve(process.cwd(), 'public/parsed_configs/2026_01_10');

function loadJson(filename: string): any {
    try {
        const filePath = path.join(configDir, filename);
        if (!fs.existsSync(filePath)) return {};
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Error loading ${filename}:`, e);
        return {};
    }
}

const libs: LibraryData = {
    mainBattleLibrary: loadJson('MainBattleLibrary.json'),
    enemyAgeScalingLibrary: loadJson('EnemyAgeScalingLibrary.json'),
    enemyLibrary: loadJson('EnemyLibrary.json'),
    weaponLibrary: loadJson('WeaponLibrary.json'),
    mainBattleConfig: loadJson('MainBattleConfig.json'),
    itemBalancingConfig: loadJson('ItemBalancingConfig.json'),
    projectilesLibrary: loadJson('ProjectilesLibrary.json'),
    hammerThiefDungeonBattleLibrary: {},
    skillDungeonBattleLibrary: {},
    eggDungeonBattleLibrary: {},
    potionDungeonBattleLibrary: {},
    itemBalancingLibrary: loadJson('ItemBalancingLibrary.json'),
    petUpgradeLibrary: loadJson('PetUpgradeLibrary.json'),
    petBalancingLibrary: loadJson('PetBalancingLibrary.json'),
    petLibrary: loadJson('PetLibrary.json'),
    skillLibrary: loadJson('SkillLibrary.json'),
    skillPassiveLibrary: loadJson('SkillPassiveLibrary.json'),
    mountUpgradeLibrary: loadJson('MountUpgradeLibrary.json'),
    techTreeLibrary: loadJson('TechTreeLibrary.json'),
    techTreePositionLibrary: loadJson('TechTreePositionLibrary.json')
} as unknown as LibraryData; // Coerce for missing fields

// --- RUN DEBUG ---

async function runDebug() {
    console.log("--- DEBUG SIMULATION ---");

    // 1. Calculate Stats
    console.log("Calculating Player Stats...");
    // @ts-ignore
    const playerStats = calculateAllStats(mockProfile, libs);
    console.log(`Base Dmg: ${playerStats.basePlayerDamage}`);
    console.log(`Item Dmg: ${playerStats.itemDamage}`);
    console.log(`Dmg Multi: ${playerStats.damageMultiplier}`);
    console.log(`Config Power Multi: ${libs.itemBalancingConfig?.PlayerPowerDamageMultiplier}`);
    console.log(`Total Dmg: ${playerStats.totalDamage}`);

    // Check if 8x is applied (Total should be roughly (Base + Item) * Multi * 8)
    const expected = (playerStats.basePlayerDamage + playerStats.itemDamage) * playerStats.damageMultiplier * 8.0;
    console.log(`Expected (with 8x): ${expected}`);

    if (Math.abs(playerStats.totalDamage - expected) < 1.0) {
        console.log("✅ 8x Multiplier CONFIRMED.");
    } else {
        console.log("❌ 8x Multiplier NOT APPLIED.");
    }

    // 2. Simulate Battle (Age 10, Battle 15)
    console.log("\nSimulating Age 10 Battle 15...");
    const result = simulateBattle(playerStats, 10, 15, 0, libs);

    if (result) {
        console.log(`Victory: ${result.victory}`);
        console.log(`Remaining HP: ${result.playerHealthRemaining}`);
        console.log(`Total Enemy HP (Wave 1): ${result.waves[0]?.totalEnemyHp}`);

        // Debug Enemy Scaling
        // Manual calc: Age 10 Base HP * 1.072^15
        const ageScaling = libs.enemyAgeScalingLibrary['10'];
        const baseHp = ageScaling.Health.Raw;
        const manualScaling = baseHp * Math.pow(1.072, 15);
        console.log(`Age 10 Base HP: ${baseHp}`);
        console.log(`Simulated Enemy HP: ${result.waves[0]?.totalEnemyHp / result.waves[0]?.enemies[0].count}`);
        console.log(`Manual 1.072^15 Scaling: ${manualScaling}`);
    } else {
        console.log("❌ Simulation returned null");
    }
}

runDebug();
