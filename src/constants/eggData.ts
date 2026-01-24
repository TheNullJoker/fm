export const eggDropRates: Record<string, Record<string, number>> = {
    // Chapter 1
    '1-1': { common: 0.99, rare: 0.01 },
    '1-2': { common: 0.98, rare: 0.02 },
    '1-3': { common: 0.95, rare: 0.05 },
    '1-4': { common: 0.8995, rare: 0.10, epic: 0.0005 },
    '1-5': { common: 0.8854, rare: 0.114, epic: 0.0006 },
    '1-6': { common: 0.8693, rare: 0.13, epic: 0.0007 },
    '1-7': { common: 0.851, rare: 0.1482, epic: 0.0008 },
    '1-8': { common: 0.83, rare: 0.1689, epic: 0.0011 },
    '1-9': { common: 0.8061, rare: 0.1925, epic: 0.0014 },
    '1-10': { common: 0.7788, rare: 0.2195, epic: 0.0017 },
    '10-10': { common: 0.175, rare: 0.165, epic: 0.165, legendary: 0.165, ultimate: 0.165, mythic: 0.165 }
    // ... [Truncated for prompt brevity, but assume typical pattern or full file in real usage]
};

// Base hatching times in minutes
export const baseHatchingTimes: Record<string, number> = {
    common: 30,
    rare: 120,
    epic: 240,
    legendary: 480,
    ultimate: 960,
    mythic: 1920
};
