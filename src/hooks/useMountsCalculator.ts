import { useState, useMemo, useEffect } from 'react';
import { mountSummonRates, mountWarPoints, WINDERS_PER_SUMMON } from '../constants/mountData';

export type CalculationMode = 'calculate' | 'target';

export function useMountsCalculator() {
    const [level, setLevel] = useState(1);
    const [mode, setMode] = useState<CalculationMode>('calculate');

    // Inputs
    const [freeSummonPercent, setFreeSummonPercent] = useState(0);
    const [windersCount, setWindersCount] = useState(0);
    const [costPerMount, setCostPerMount] = useState(WINDERS_PER_SUMMON);
    const [targetPoints, setTargetPoints] = useState(0);

    // Persist level
    useEffect(() => {
        const saved = localStorage.getItem('mountLevel');
        if (saved) setLevel(parseInt(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('mountLevel', level.toString());
    }, [level]);

    // Derived: Expected Points
    const expectedPointsPerSummon = useMemo(() => {
        const rates = mountSummonRates[level];
        if (!rates) return 0;

        let expected = 0;
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'];
        for (const tier of tiers) {
            if (rates[tier]) {
                expected += rates[tier] * mountWarPoints[tier];
            }
        }
        return expected;
    }, [level]);

    const freeMultiplier = useMemo(() => {
        return 1 / (1 - (freeSummonPercent / 100));
    }, [freeSummonPercent]);

    // Calculate Mode Results
    const calculationResults = useMemo(() => {
        const effectiveWinders = windersCount * freeMultiplier;
        const expectedSummons = Math.floor(effectiveWinders / costPerMount);
        const expectedTotalPoints = expectedSummons * expectedPointsPerSummon;

        return {
            expectedSummons,
            expectedTotalPoints
        };
    }, [windersCount, freeMultiplier, costPerMount, expectedPointsPerSummon]);

    // Target Mode Results
    const targetResults = useMemo(() => {
        if (expectedPointsPerSummon === 0) return { summonsNeeded: 0, windersNeeded: 0 };

        const summonsNeeded = Math.ceil(targetPoints / expectedPointsPerSummon);
        const windersNeededRaw = summonsNeeded * costPerMount;
        const actualWindersNeeded = Math.ceil(windersNeededRaw / freeMultiplier);

        return {
            summonsNeeded,
            actualWindersNeeded
        };
    }, [targetPoints, expectedPointsPerSummon, costPerMount, freeMultiplier]);

    // Probability Breakdown
    const probabilityData = useMemo(() => {
        const rates = mountSummonRates[level];
        if (!rates) return [];

        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'];
        return tiers.filter(tier => rates[tier]).map(tier => ({
            tier,
            probability: rates[tier],
            points: mountWarPoints[tier],
            count: mode === 'calculate'
                ? Math.floor(calculationResults.expectedSummons * rates[tier])
                : 0
        }));
    }, [level, calculationResults.expectedSummons, mode]);

    return {
        level, setLevel,
        mode, setMode,
        freeSummonPercent, setFreeSummonPercent,
        windersCount, setWindersCount,
        costPerMount, setCostPerMount,
        targetPoints, setTargetPoints,
        expectedPointsPerSummon,
        calculationResults,
        targetResults,
        probabilityData
    };
}
