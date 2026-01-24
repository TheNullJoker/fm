import { Card } from '../components/UI/Card';
import { HelpCircle, Clock, Star, Key, Terminal, Swords, Heart, Zap } from 'lucide-react';

export default function FAQ() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 border-b border-border pb-6">
                <HelpCircle className="w-10 h-10 text-accent-primary" />
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-text-muted">Answers to common questions about Forge Master</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2">
                    <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-accent-tertiary">
                        <Clock className="w-5 h-5" /> Game Basics
                    </h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-bg-input/50 rounded-lg border border-border">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-text-primary">
                                When does the game reset?
                            </h3>
                            <p className="text-sm text-text-secondary">
                                Daily reset is at <strong>midnight UTC</strong>. This resets dungeon keys, challenge tickets, and war days.
                            </p>
                        </div>
                        <div className="p-4 bg-bg-input/50 rounded-lg border border-border">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-text-primary">
                                What is the offline timer?
                            </h3>
                            <p className="text-sm text-text-secondary">
                                The base maximum is <strong>4 hours</strong> for idle hammer & coin collection. You can increase this via the Tech Tree or VIP levels.
                            </p>
                        </div>
                        <div className="p-4 bg-bg-input/50 rounded-lg border border-border">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-text-primary">
                                Can I change my IGN?
                            </h3>
                            <p className="text-sm text-text-secondary">
                                The first name change is <strong>free</strong>. Subsequent changes cost <strong>200 gems</strong>. Names must be unique across all servers.
                            </p>
                        </div>
                        <div className="p-4 bg-bg-input/50 rounded-lg border border-border">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-text-primary">
                                How are servers assigned?
                            </h3>
                            <p className="text-sm text-text-secondary">
                                You are automatically placed with players who started around the same time in your region. <strong>Server transfers are not available.</strong>
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-accent-tertiary">
                        <Key className="w-5 h-5" /> Dungeon Keys
                    </h2>
                    <ul className="space-y-3 list-disc list-inside text-sm text-text-secondary">
                        <li>Keys reset at midnight and are <strong>only consumed if you beat the level</strong>.</li>
                        <li>
                            <strong className="text-accent-primary">Rollover Rule:</strong> If you have 0, 1, or 2 keys, they reset to 2/2. If you have more than 2 (from purchases/events), they remain until used.
                        </li>
                        <li>Use <strong>"Sweep Last"</strong> to instantly complete your highest cleared level when stuck or in a hurry.</li>
                    </ul>
                </Card>

                <Card>
                    <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-accent-tertiary">
                        <Terminal className="w-5 h-5" /> Game Terms
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-border/50 pb-2">
                            <dt className="font-mono font-bold text-accent-secondary">META</dt>
                            <dd className="text-text-muted">Most Effective Tactics Available</dd>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                            <dt className="font-mono font-bold text-accent-secondary">IGN</dt>
                            <dd className="text-text-muted">In-Game Name</dd>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-2">
                            <dt className="font-mono font-bold text-accent-secondary">DPS</dt>
                            <dd className="text-text-muted">Damage Per Second</dd>
                        </div>
                        <div className="flex justify-between pb-2">
                            <dt className="font-mono font-bold text-accent-secondary">LB</dt>
                            <dd className="text-text-muted">Leaderboard</dd>
                        </div>
                    </dl>
                </Card>

                <Card className="md:col-span-2">
                    <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-accent-tertiary">
                        <Swords className="w-5 h-5" /> Stat Definitions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-3 p-3 bg-bg-input/30 rounded border border-border/50">
                            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                            <div>
                                <strong className="text-text-primary">Attack Speed</strong>
                                <p className="text-text-muted text-xs mt-1">Increases how often you attack. Caps at a certain point.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-bg-input/30 rounded border border-border/50">
                            <Heart className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <strong className="text-text-primary">Health Regen</strong>
                                <p className="text-text-muted text-xs mt-1">Auto-heal per second, calculated as a percentage of max HP.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-bg-input/30 rounded border border-border/50">
                            <Swords className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                                <strong className="text-text-primary">Critical Chance</strong>
                                <p className="text-text-muted text-xs mt-1">Probability of landing a critical hit for bonus damage.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-bg-input/30 rounded border border-border/50">
                            <Star className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                            <div>
                                <strong className="text-text-primary">Lifesteal</strong>
                                <p className="text-text-muted text-xs mt-1">Heal per weapon attack, based on a percentage of damage dealt.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
