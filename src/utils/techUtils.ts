/**
 * Maps technical tech node types to human-readable names
 */
export function getTechNodeName(type: string): string {
    return type
        .replace(/([A-Z])/g, ' $1')
        .replace(/^Base/, 'Base ')
        .trim();
}

/**
 * Generates a human-readable description for a tech node based on its effect data
 */
export function getTechNodeDescription(nodeType: string, effect: any): string {
    if (!effect?.Stats || effect.Stats.length === 0) {
        // Fallback for nodes without structured stats
        switch (nodeType) {
            case 'AutoForge': return 'Enables automatic forging of equipment.';
            default: return 'Provides various bonuses to your progress.';
        }
    }

    const stat = effect.Stats[0];
    const target = stat.StatNode?.StatTarget;
    const type = stat.StatNode?.UniqueStat?.StatType;
    const nature = stat.StatNode?.UniqueStat?.StatNature;

    let action = "Increases";
    if (nature === 'OneMinusMultiplier' || type === 'Cost') action = "Decreases";
    if (type === 'TimerSpeed') action = "Increases speed of";

    let subject = "the attribute";
    const targetType = target?.['$type'];

    switch (targetType) {
        case 'WeaponStatTarget':
            subject = "Weapon";
            break;
        case 'EquipmentStatTarget':
            const itemTypes = ['Helmet', 'Armour', 'Gloves', 'Necklace', 'Ring', 'Weapon', 'Shoes', 'Belt'];
            subject = target.ItemType !== null ? itemTypes[target.ItemType] : "Equipment";
            break;
        case 'ForgeStatTarget':
            subject = "Forge";
            break;
        case 'ActiveSkillStatTarget':
            subject = "Active Skills";
            break;
        case 'PassiveSkillStatTarget':
            subject = "Passive Skills";
            break;
        case 'PetStatTarget':
            subject = "Pets";
            break;
        case 'MountStatTarget':
            subject = "Mounts";
            break;
        case 'EggStatTarget':
            subject = "Egg hatching";
            break;
        case 'OfflineCurrencyStatTarget':
            const currencies = ['Coin', 'Gem', 'Hammer'];
            subject = `Offline ${currencies[target.CurrencyType] || 'Currency'} rewards`;
            break;
        case 'OfflineTimerStatTarget':
            subject = "Maximum offline duration";
            break;
        case 'DungeonStatTarget':
            const dungeons = ['Hammer Thief', 'Ghost Town', 'Egg Farm'];
            subject = `${dungeons[target.DungeonType] || 'Dungeon'} rewards`;
            break;
    }

    let statName = type;
    switch (type) {
        case 'Damage': statName = "Damage"; break;
        case 'Health': statName = "Health"; break;
        case 'Cost': statName = "Cost"; break;
        case 'MaxLevel': statName = "Maximum Level"; break;
        case 'SellPrice': statName = "Sell Price"; break;
        case 'FreebieChance': statName = "Free Upgrade Chance"; break;
        case 'TimerSpeed': statName = nature === 'Divisor' ? "Speed" : "Cooldowns"; break;
        case 'Bonus': statName = "Bonus Amount"; break;
    }

    if (nature === 'Additive') {
        return `${action} ${subject} ${statName} by a flat amount per level.`;
    }

    return `${action} ${subject} ${statName} for each level researched.`;
}
