
const fs = require('fs');
const path = require('path');

const mainBattleLibPath = 'public/parsed_configs/2026_01_10/MainBattleLibrary.json';

try {
    const raw = fs.readFileSync(mainBattleLibPath, 'utf8');
    const data = JSON.parse(raw);
    const keys = Object.keys(data);

    console.log(`Total keys: ${keys.length}`);

    // Test Regex from useBattleSimulation.ts
    // /'AgeIdx':\s*(\d+)/
    let matchCount = 0;
    const lookup = {};

    keys.forEach(key => {
        const ageMatch = key.match(/'AgeIdx':\s*(\d+)/);
        const battleMatch = key.match(/'BattleIdx':\s*(\d+)/);

        if (ageMatch && battleMatch) {
            matchCount++;
            const a = ageMatch[1];
            const b = battleMatch[1];
            lookup[`${a}-${b}`] = true;
        } else {
            console.log(`Regex Failed for key: "${key}"`);
        }
    });

    console.log(`Regex Matched: ${matchCount}`);

    // Test direct construction for Age 0, Battle 0
    // const battleKey = `{'AgeIdx': ${ageIdx}, 'BattleIdx': ${battleIdx}}`;
    const checkKey = (a, b) => {
        const constructed = `{'AgeIdx': ${a}, 'BattleIdx': ${b}}`;
        if (data[constructed]) {
            console.log(`Direct access success for ${a}-${b}`);
        } else {
            console.log(`Direct access FAILED for ${a}-${b}. Constructed: "${constructed}"`);
            // Find actual key for this
            const actual = keys.find(k => k.includes(`'AgeIdx': ${a}`) && k.includes(`'BattleIdx': ${b}`));
            console.log(`Actual key found: "${actual}"`);
        }
    };

    checkKey(0, 0);
    checkKey(1, 0);

} catch (e) {
    console.error(e);
}
