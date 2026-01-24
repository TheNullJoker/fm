import { useState, useMemo, useEffect } from 'react';
import { eggDropRates, baseHatchingTimes } from '../constants/eggData';

export function useEggsCalculator() {
    // Use string key for difficulty to match lookup
    const [difficulty, setDifficulty] = useState('1-1');
    const [speedBonus, setSpeedBonus] = useState(0);

    // Persist
    useEffect(() => {
        const saved = localStorage.getItem('eggDifficulty');
        if (saved && eggDropRates[saved]) setDifficulty(saved);
    }, []);

    useEffect(() => {
        localStorage.setItem('eggDifficulty', difficulty);
    }, [difficulty]);

    const rates = useMemo(() => {
        return eggDropRates[difficulty] || {};
    }, [difficulty]);

    const hatchingTimes = useMemo(() => {
        const result: Record<string, number> = {};
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'];

        tiers.forEach(tier => {
            const base = baseHatchingTimes[tier];
            // Formula: Base / (1 + Bonus/100)
            result[tier] = base / (1 + (speedBonus / 100));
        });
        return result;
    }, [speedBonus]);

    const probabilityData = useMemo(() => {
        const tiers = ['common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic'];
        return tiers.filter(tier => rates[tier]).map(tier => ({
            tier,
            probability: rates[tier]
        }));
    }, [rates]);

    return {
        difficulty, setDifficulty,
        speedBonus, setSpeedBonus,
        hatchingTimes,
        probabilityData
    };
}
