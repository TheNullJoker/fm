import { useEggsCalculator } from '../hooks/useEggsCalculator';
import { eggDropRates } from '../constants/eggData';
import { Card, CardHeader, CardTitle } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { Select } from '../components/UI/Select';
import { cn } from '../lib/utils';
import { Egg, Clock } from 'lucide-react';

export default function Eggs() {
    const {
        difficulty, setDifficulty,
        speedBonus, setSpeedBonus,
        hatchingTimes,
        probabilityData
    } = useEggsCalculator();

    // Helper to format minutes to d h m
    const formatTime = (minutes: number) => {
        if (minutes >= 1440) {
            const days = Math.floor(minutes / 1440);
            const hours = Math.floor((minutes % 1440) / 60);
            const mins = Math.round(minutes % 60);
            return `${days}d ${hours}h ${mins}m`;
        } else if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            return `${hours}h ${mins}m`;
        }
        return `${Math.round(minutes)}m`;
    };

    const availableStages = Object.keys(eggDropRates).sort((a, b) => {
        // Custom sort "1-2" vs "10-2"
        const [wA, sA] = a.split('-').map(Number);
        const [wB, sB] = b.split('-').map(Number);
        if (wA !== wB) return wA - wB;
        return sA - sB;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent inline-flex items-center gap-3">
                    <Egg className="w-8 h-8 text-accent-primary" />
                    Egg Calculator
                </h1>
                <p className="text-text-secondary">Check egg drop rates and calculate hatching times.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                        </CardHeader>
                        <div className="space-y-6">
                            <Select
                                label="Stage Difficulty"
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                            >
                                {availableStages.map(stage => (
                                    <option key={stage} value={stage}>Stage {stage}</option>
                                ))}
                            </Select>

                            <Input
                                label="Tech Tree Speed Bonus (%)"
                                type="number"
                                value={speedBonus || ''}
                                onChange={(e) => setSpeedBonus(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-accent-tertiary" />
                                Drop Rates & Hatching Times
                            </CardTitle>
                        </CardHeader>

                        <div className="space-y-3">
                            {probabilityData.map((item) => (
                                <div
                                    key={item.tier}
                                    className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border"
                                >
                                    <div className="flex flex-col">
                                        <span className={cn("font-bold uppercase text-xs", `text-rarity-${item.tier}`)}>
                                            {item.tier}
                                        </span>
                                        <span className="text-sm font-medium text-text-primary">
                                            {(item.probability * 100).toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-text-secondary">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-sm font-mono">
                                            {formatTime(hatchingTimes[item.tier])}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
