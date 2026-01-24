import { useState, useMemo, useEffect } from 'react';
import { skillRatesData, skillWarPoints, GEMS_PER_SUMMON, ITEMS_PER_SUMMON } from '../constants/skillData';

export type CalculationMode = 'calculate' | 'target';

export function useSkillsCalculator() {
    // 1-100 linear scale for logic, display mapped to World-Phase (e.g. 5-3)
    const [level, setLevel] = useState(1);
    const [mode, setMode] = useState<CalculationMode>('calculate');

    // Inputs
    const [freeSummonPercent, setFreeSummonPercent] = useState(0);
    const [summonCount, setSummonCount] = useState(0); // This represents TICKETS/GEMS count input
    const [costPerSummon, setCostPerSummon] = useState(GEMS_PER_SUMMON);
    const [targetPoints, setTargetPoints] = useState(0);

    // Persist level
    useEffect(() => {
        const saved = localStorage.getItem('skillLevel');
        if (saved) setLevel(parseInt(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('skillLevel', level.toString());
    }, [level]);

    // Derived
    const rates = useMemo(() => {
        const raw = skillRatesData[level] || [0, 0, 0, 0, 0, 0];
        return {
            common: raw[0] / 100,
            rare: raw[1] / 100,
            epic: raw[2] / 100,
            legendary: raw[3] / 100,
            ultimate: raw[4] / 100,
            mythic: raw[5] / 100
        };
    }, [level]);

    const expectedPointsPerAction = useMemo(() => {
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'] as const;
        let expected = 0;
        for (const tier of tiers) {
            expected += rates[tier] * skillWarPoints[tier];
        }
        return expected * ITEMS_PER_SUMMON; // Total points per "Summon Button Click" (5 items)
    }, [rates]);

    const freeMultiplier = useMemo(() => {
        return 1 / (1 - (freeSummonPercent / 100));
    }, [freeSummonPercent]);

    // Results
    const calculationResults = useMemo(() => {
        const effectiveTickets = summonCount * freeMultiplier;
        const actualSummons = Math.floor(effectiveTickets / costPerSummon);
        const expectedPoints = actualSummons * expectedPointsPerAction;

        return {
            actualSummons,
            expectedPoints,
            totalItems: actualSummons * ITEMS_PER_SUMMON
        };
    }, [summonCount, freeMultiplier, costPerSummon, expectedPointsPerAction]);

    const targetResults = useMemo(() => {
        if (expectedPointsPerAction === 0) return { summonsNeeded: 0, ticketsNeeded: 0 };

        const summonsNeeded = Math.ceil(targetPoints / expectedPointsPerAction);
        const ticketsNeededRaw = summonsNeeded * costPerSummon;
        const actualTicketsNeeded = Math.ceil(ticketsNeededRaw / freeMultiplier);

        return {
            summonsNeeded,
            actualTicketsNeeded
        };
    }, [targetPoints, expectedPointsPerAction, costPerSummon, freeMultiplier]);

    // Breakdown
    const probabilityData = useMemo(() => {
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'] as const;
        return tiers.filter(tier => rates[tier] > 0.0001).map(tier => ({
            tier,
            probability: rates[tier],
            points: skillWarPoints[tier],
            count: mode === 'calculate'
                ? Math.floor(calculationResults.totalItems * rates[tier])
                : 0
        }));
    }, [rates, calculationResults.totalItems, mode]);

    return {
        level, setLevel,
        mode, setMode,
        freeSummonPercent, setFreeSummonPercent,
        summonCount, setSummonCount,
        costPerSummon, setCostPerSummon,
        targetPoints, setTargetPoints,
        expectedPointsPerAction,
        calculationResults,
        targetResults,
        probabilityData
    };
}
