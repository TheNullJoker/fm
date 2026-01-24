import { useState, useMemo, useEffect } from 'react';
import { forgeProbabilities, expValues } from '../constants/forgeData';

export type CalculationMode = 'calculate' | 'target';

interface UseForgeCalculatorProps {
    initialLevel?: number;
}

export function useForgeCalculator({ initialLevel = 1 }: UseForgeCalculatorProps = {}) {
    // State
    const [level, setLevel] = useState(initialLevel);
    const [mode, setMode] = useState<CalculationMode>('calculate');

    // Inputs
    const [freeSummonPercent, setFreeSummonPercent] = useState(0);
    const [hammerCount, setHammerCount] = useState(0);
    const [targetExp, setTargetExp] = useState(0);

    // Coin Inputs
    const [maxItemLevel, setMaxItemLevel] = useState(100);
    const [priceBonus, setPriceBonus] = useState(0);

    // Persist level
    useEffect(() => {
        const saved = localStorage.getItem('forgeMasterLevel');
        if (saved) setLevel(parseInt(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('forgeMasterLevel', level.toString());
    }, [level]);

    // Derived Values
    const expPerHammer = useMemo(() => {
        const probs = forgeProbabilities[level];
        if (!probs) return 0;

        let expected = 0;
        for (const [tier, probability] of Object.entries(probs)) {
            const exp = expValues[tier] || 0;
            expected += (probability / 100) * exp;
        }
        return expected;
    }, [level]);

    const freeMultiplier = useMemo(() => {
        return 1 / (1 - (freeSummonPercent / 100));
    }, [freeSummonPercent]);

    const effectiveHammers = useMemo(() => {
        return hammerCount * freeMultiplier;
    }, [hammerCount, freeMultiplier]);

    // Results: Calculate Mode
    const totalExp = useMemo(() => {
        return expPerHammer * effectiveHammers;
    }, [expPerHammer, effectiveHammers]);

    // Results: Target Mode
    const hammersNeeded = useMemo(() => {
        if (expPerHammer === 0) return 0;
        return Math.ceil(targetExp / expPerHammer);
    }, [targetExp, expPerHammer]);

    const actualHammersNeeded = useMemo(() => {
        return Math.ceil(hammersNeeded / freeMultiplier);
    }, [hammersNeeded, freeMultiplier]);

    const expectedWithRecommended = useMemo(() => {
        return expPerHammer * hammersNeeded;
    }, [expPerHammer, hammersNeeded]);

    // Coin Calculation
    const coinEstimates = useMemo(() => {
        const bonusMultiplier = 1 + (priceBonus / 100);
        const probs = forgeProbabilities[level];

        let lowestProb = 0;
        if (probs) {
            lowestProb = Math.min(...Object.values(probs));
        }
        const standardProb = 100 - lowestProb;

        const priceBase = 20;

        // Standard items Min: Max - 5 (at least 1)
        const standardItemLevelMin = Math.max(1, maxItemLevel - 5);
        const priceStandardMin = priceBase * Math.pow(1.01, standardItemLevelMin - 1);

        // Lowest Probability Item Min: Level 1
        const priceLowestMin = priceBase;

        // Max Price uses Max Level for all
        const priceMax = priceBase * Math.pow(1.01, maxItemLevel - 1);

        // Weighted Averages
        const avgPriceMin = ((standardProb * priceStandardMin) + (lowestProb * priceLowestMin)) / 100;
        const avgPriceMax = priceMax;

        return {
            min: avgPriceMin * effectiveHammers * bonusMultiplier,
            max: avgPriceMax * effectiveHammers * bonusMultiplier
        };
    }, [level, maxItemLevel, priceBonus, effectiveHammers]);

    // Probability Breakdown Data
    const probabilityData = useMemo(() => {
        const probs = forgeProbabilities[level];
        if (!probs) return [];

        return Object.entries(probs)
            .sort((a, b) => b[1] - a[1]) // Sort by probability desc
            .map(([tier, probability]) => ({
                tier,
                probability,
                count: mode === 'calculate'
                    ? Math.floor(effectiveHammers * (probability / 100))
                    : 0
            }));
    }, [level, effectiveHammers, mode]);

    return {
        // State setters
        setLevel,
        setMode,
        setFreeSummonPercent,
        setHammerCount,
        setTargetExp,
        setMaxItemLevel,
        setPriceBonus,

        // State values
        level,
        mode,
        freeSummonPercent,
        hammerCount,
        targetExp,
        maxItemLevel,
        priceBonus,

        // Results
        expPerHammer,
        totalExp,
        actualHammersNeeded,
        expectedWithRecommended,
        coinEstimates,
        probabilityData
    };
}
