import { Card } from '../components/UI/Card';
import { GameIcon } from '../components/UI/GameIcon';
import { Shield, Swords, Calendar } from 'lucide-react';

// Static info for now, as Guild War data is complex or might just be static rules
export default function GuildWar() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 border-b border-border pb-6">
                <Shield className="w-10 h-10 text-accent-primary" />
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                        Guild War
                    </h1>
                    <p className="text-text-muted">Battle other guilds for territory and rewards</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-accent-primary">
                        <Calendar className="w-5 h-5" /> Schedule
                    </h2>
                    <ul className="space-y-4">
                        <li className="flex gap-4 p-3 bg-bg-input/50 rounded border border-border/50">
                            <div className="font-bold text-white min-w-[80px]">Prep Phase</div>
                            <div className="text-text-secondary text-sm">
                                Monday - Friday. Donate resources to buff your guild fort.
                            </div>
                        </li>
                        <li className="flex gap-4 p-3 bg-bg-input/50 rounded border border-border/50">
                            <div className="font-bold text-accent-primary min-w-[80px]">War Phase</div>
                            <div className="text-text-secondary text-sm">
                                Saturday & Sunday. Attack enemy forts and defend yours.
                            </div>
                        </li>
                    </ul>
                </Card>

                <Card>
                    <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-red-400">
                        <Swords className="w-5 h-5" /> Combat Rules
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li>Each player gets <strong>2 attacks</strong> per war day.</li>
                        <li>Matching relies on <strong>Guild Power</strong>.</li>
                        <li>Destroying the main fort grants maximum points.</li>
                        <li>Defeated players cannot attack again.</li>
                    </ul>
                </Card>

                <Card className="md:col-span-2">
                    <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-yellow-400">
                        <GameIcon name="chest-blue" className="w-5 h-5" /> Rewards
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-bg-input/50 rounded border border-border/50 text-center">
                            <div className="text-accent-primary font-bold mb-1">Guild Coins</div>
                            <div className="text-xs text-text-muted">Shop Currency</div>
                        </div>
                        <div className="p-4 bg-bg-input/50 rounded border border-border/50 text-center">
                            <div className="text-blue-400 font-bold mb-1">Gems</div>
                            <div className="text-xs text-text-muted">Weekly Ranking</div>
                        </div>
                        <div className="p-4 bg-bg-input/50 rounded border border-border/50 text-center">
                            <div className="text-purple-400 font-bold mb-1">Frames</div>
                            <div className="text-xs text-text-muted">Exclusive Cosmetics</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
