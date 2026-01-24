import { useState } from 'react';
import { Card } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { Clock, PlayCircle } from 'lucide-react';
import { GameIcon } from '../components/UI/GameIcon';
import { formatNumber } from '../utils/format';

export default function Offline() {
    const [hours, setHours] = useState(8);
    const [stage, setStage] = useState(50);
    const [techBonus, setTechBonus] = useState(0);

    // Logic from legacy script
    const baseCoinsPerHour = 1000 + (stage * 200);
    const baseHammersPerHour = 10 + (stage * 2);
    const bonusMultiplier = 1 + (techBonus / 100);

    const totalCoins = Math.floor(baseCoinsPerHour * hours * bonusMultiplier);
    const totalHammers = Math.floor(baseHammersPerHour * hours * bonusMultiplier);
    const withAd = Math.floor(totalCoins * 2);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 border-b border-border pb-6">
                <Clock className="w-10 h-10 text-accent-primary" />
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                        Offline Rewards
                    </h1>
                    <p className="text-text-muted">Calculate earnings while you are away</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="font-semibold mb-4 text-accent-primary">Parameters</h2>
                        <div className="space-y-4">
                            <Input
                                label="Hours Offline"
                                type="number"
                                value={hours}
                                onChange={(e) => setHours(Math.min(24, Math.max(1, Number(e.target.value))))}
                                min={1}
                                max={24}
                            />
                            <Input
                                label="Current Stage"
                                type="number"
                                value={stage}
                                onChange={(e) => setStage(Math.max(1, Number(e.target.value)))}
                                min={1}
                            />
                            <Input
                                label="Tech Tree Bonus (%)"
                                type="number"
                                value={techBonus}
                                onChange={(e) => setTechBonus(Math.max(0, Number(e.target.value)))}
                                min={0}
                            />
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-bg-secondary to-bg-card border-none">
                        <h3 className="font-bold text-accent-secondary mb-3">Offline Limits</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-black/20 rounded">
                                <div className="text-xs text-text-muted">Base</div>
                                <div className="font-bold">2h</div>
                            </div>
                            <div className="p-3 bg-black/20 rounded">
                                <div className="text-xs text-text-muted">With Tech</div>
                                <div className="font-bold text-accent-primary">8h+</div>
                            </div>
                            <div className="p-3 bg-black/20 rounded">
                                <div className="text-xs text-text-muted">Max (VIP)</div>
                                <div className="font-bold text-yellow-400">24h</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Results */}
                <div className="space-y-6">
                    <Card className="h-full flex flex-col justify-center">
                        <h2 className="font-semibold mb-6 text-accent-primary text-center">Estimated Rewards</h2>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 bg-bg-input rounded-lg border border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GameIcon name="coin" className="w-8 h-8" />
                                    <span className="font-medium text-text-secondary">Coins</span>
                                </div>
                                <div className="text-xl font-bold text-accent-primary">
                                    {formatNumber(totalCoins)}
                                </div>
                            </div>

                            <div className="p-4 bg-bg-input rounded-lg border border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GameIcon name="hammer" className="w-8 h-8" />
                                    <span className="font-medium text-text-secondary">Hammers</span>
                                </div>
                                <div className="text-xl font-bold text-text-primary">
                                    {formatNumber(totalHammers)}
                                </div>
                            </div>

                            <div className="relative mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30 flex items-center justify-between overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
                                <div className="relative flex items-center gap-3">
                                    <PlayCircle className="w-8 h-8 text-yellow-400" />
                                    <div>
                                        <span className="font-bold text-yellow-100 block">With Ad Bonus</span>
                                        <span className="text-xs text-yellow-200/70">(Double Coins)</span>
                                    </div>
                                </div>
                                <div className="relative text-2xl font-bold text-yellow-400">
                                    {formatNumber(withAd)}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
