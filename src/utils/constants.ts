export const AGES = [
    "Primitive",
    "Medieval",
    "Early-Modern",
    "Modern",
    "Space",
    "Interstellar",
    "Multiverse",
    "Quantum",
    "Underworld",
    "Divine"
];

export const RARITIES = [
    "Common",
    "Rare",
    "Epic",
    "Legendary",
    "Ultimate",
    "Mythic"
];

export const MAX_ACTIVE_PETS = 3;
export const MAX_ACTIVE_SKILLS = 3;

/**
 * Skill Mechanics Definitions
 * Defines hit counts, AOE status, and timing/intervals for skills.
 * 
 * Key Rules (from game analysis):
 * - Library damage values are TOTAL damage (not per hit)
 * - isSingleTarget skills target nearest enemy, re-target if dies mid-combo
 * - isAOE skills hit all enemies
 * 
 * Sources: skills.txt, skill2.txt, skill_mechanics_analysis.md
 */
export const SKILL_MECHANICS: {
    [key: string]: {
        count: number,
        isAOE?: boolean,
        isSingleTarget?: boolean,
        interval?: number,
        delay?: number,
        isDuration?: boolean,
        damageIsPerHit?: boolean
    }
} = {
    // --- Buff Skills (No direct damage, apply bonuses while active) ---
    "0": { count: 0 }, // Meat: Healing Buff
    "Meat": { count: 0 },
    "1": { count: 0 }, // Morale: Damage + Healing Buff
    "Morale": { count: 0 },
    "6": { count: 0 }, // Berserk: Damage Buff
    "Berserk": { count: 0 },
    "12": { count: 0 }, // Buff: Generic Buff
    "Buff": { count: 0 },
    "13": { count: 0 }, // HigherMorale: Damage + Healing Buff
    "HigherMorale": { count: 0 },

    // --- Multi-Hit Single Target Skills (Target nearest, re-target on kill) ---
    "2": { count: 3, isSingleTarget: true, delay: 0.2 }, // Arrows
    "Arrows": { count: 3, isSingleTarget: true, delay: 0.2 },
    "3": { count: 5, isSingleTarget: true, delay: 0.2 }, // Shuriken
    "Shuriken": { count: 5, isSingleTarget: true, delay: 0.2 },
    "11": { count: 5, isAOE: true, interval: 0.2, delay: 0.1 }, // Lightning (User confirmed: Hits all)
    "Lightning": { count: 5, isAOE: true, interval: 0.2, delay: 0.1 },

    // --- Multi-Hit AOE Skills ---
    "4": { count: 8, isAOE: true, interval: 0.15 }, // Shout
    "Shout": { count: 8, isAOE: true, interval: 0.15 },
    "5": { count: 5, isAOE: true, interval: 0.3, delay: 1.0 }, // Meteorite
    "Meteorite": { count: 5, isAOE: true, interval: 0.3, delay: 1.0 },
    "16": { count: 3, isAOE: true, interval: 0.3, delay: 0.5 }, // CannonBarrage
    "CannonBarrage": { count: 3, isAOE: true, interval: 0.3, delay: 0.5 },

    // --- Single Hit AOE Skills ---
    "7": { count: 1, isAOE: true, delay: 0.25 }, // Stampede
    "Stampede": { count: 1, isAOE: true, delay: 0.25 },
    "8": { count: 1, isAOE: true, delay: 0.5 }, // Thorns
    "Thorns": { count: 1, isAOE: true, delay: 0.5 },
    "9": { count: 1, isAOE: true, delay: 1.5 }, // Bomb
    "Bomb": { count: 1, isAOE: true, delay: 1.5 },
    "10": { count: 1, isAOE: true, delay: 0.5 }, // Worm
    "Worm": { count: 1, isAOE: true, delay: 0.5 },
    "14": { count: 15, isAOE: true, interval: 0.2, delay: 0.5 }, // RainOfArrows (~15 ticks)
    "RainOfArrows": { count: 15, isAOE: true, interval: 0.2, delay: 0.5 },
    "15": { count: 1, isAOE: true, delay: 0.5 }, // StrafeRun
    "StrafeRun": { count: 3, isAOE: true, delay: 0.5, interval: 0.25, damageIsPerHit: true },

    // --- Summon Skills (Creates entity that attacks periodically) ---
    "17": { count: 10, isAOE: false, isSingleTarget: true, interval: 0.8, isDuration: true, damageIsPerHit: true }, // Drone: 10 hits over 8s
    "Drone": { count: 10, isAOE: false, isSingleTarget: true, interval: 0.8, isDuration: true, damageIsPerHit: true },
};

