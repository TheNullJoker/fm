
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Play, Pause } from 'lucide-react';
import { Button } from '../UI/Button';
import { PvpBattleEngine, PvpPlayerStats } from '../../utils/PvpBattleEngine';
import { cn } from '../../lib/utils';
// Removed unused imports

interface PvpBattleVisualizerProps {
    isOpen: boolean;
    onClose: () => void;
    player1Stats: PvpPlayerStats;
    player2Stats: PvpPlayerStats;
    player1Name?: string;
    player2Name?: string;
}

export function PvpBattleVisualizer({
    isOpen,
    onClose,
    player1Stats,
    player2Stats,
    player1Name = "Player",
    player2Name = "Enemy"
}: PvpBattleVisualizerProps) {
    const [engine, setEngine] = useState<PvpBattleEngine | null>(null);
    const [snapshot, setSnapshot] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [winner, setWinner] = useState<'player1' | 'player2' | 'tie' | null>(null);
    const requestRef = useRef<number>();

    // Initialize Engine
    const initBattle = () => {
        const newEngine = new PvpBattleEngine(player1Stats, player2Stats);
        setEngine(newEngine);
        setSnapshot(newEngine.getSnapshot());
        setWinner(null);
        setIsPlaying(true);
    };

    useEffect(() => {
        if (isOpen) {
            initBattle();
        } else {
            setIsPlaying(false);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [isOpen, player1Stats, player2Stats]);

    useEffect(() => {
        if (isPlaying && engine && !winner) {
            let lastTime = performance.now();

            const animate = (time: number) => {
                const dt = (time - lastTime) / 1000;
                lastTime = time;

                // Avoid unused var warning for dt by using it or ignoring it
                // We use fixed time step 1/60 for engine consistency
                if (dt > 1.0) { /* Reset if huge lag */ }

                if (engine && !winner) {
                    for (let i = 0; i < playbackSpeed; i++) {
                        const snap = engine.getSnapshot();
                        if (snap.player1.isDead || snap.player2.isDead || snap.time >= 60) {
                            setWinner(
                                snap.player1.isDead ? 'player2' :
                                    snap.player2.isDead ? 'player1' :
                                        'tie'
                            );
                            setIsPlaying(false);
                            break;
                        }
                        (engine as any).tick(1 / 60);
                    }
                    setSnapshot(engine.getSnapshot());
                    requestRef.current = requestAnimationFrame(animate);
                }
            };

            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [engine, isPlaying, winner, playbackSpeed]);

    if (!isOpen || !snapshot) return null;

    const p1 = snapshot.player1;
    const p2 = snapshot.player2;
    const p1Hp = (p1.health / p1.maxHealth) * 100;
    const p2Hp = (p2.health / p2.maxHealth) * 100;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
            <div className="bg-bg-primary w-full max-w-5xl h-[80vh] rounded-2xl border border-border flex flex-col relative overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-bg-secondary/20 z-10">
                    <div className="flex items-center gap-4">
                        <div className="text-xl font-bold font-mono">
                            {snapshot.time.toFixed(1)}s / 60.0s
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => initBattle()}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <div className="h-4 w-px bg-white/20 mx-1" />
                            <Button
                                size="sm"
                                variant={playbackSpeed === 1 ? 'secondary' : 'ghost'}
                                onClick={() => setPlaybackSpeed(1)}
                            >
                                1x
                            </Button>
                            <Button
                                size="sm"
                                variant={playbackSpeed === 5 ? 'secondary' : 'ghost'}
                                onClick={() => setPlaybackSpeed(5)}
                            >
                                5x
                            </Button>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                {/* Arena */}
                <div className="flex-1 relative bg-[url('/screenshots/background_mock.png')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Players Container */}
                    <div className="absolute inset-x-0 bottom-1/4 h-32">
                        {/* Player 1 */}
                        <div
                            className="absolute bottom-0 w-16 h-32 transition-transform duration-100 flex flex-col items-center"
                            style={{
                                left: `${(p1.position / 20) * 80 + 10}%`, // Map 0-20 position to screen %
                                transform: 'translateX(-50%)'
                            }}
                        >
                            {/* HP Bar */}
                            <div className="w-24 h-4 bg-black/50 rounded-full mb-2 border border-white/10 overflow-hidden relative">
                                <div
                                    className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-100"
                                    style={{ width: `${p1Hp}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold shadow-black drop-shadow-md">
                                    {Math.round(p1.health).toLocaleString()} / {Math.round(p1.maxHealth).toLocaleString()}
                                </div>
                            </div>

                            {/* Avatar */}
                            <div className={cn(
                                "w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-gray-800",
                                p1.combatPhase !== 'IDLE' ? "border-red-500 animate-pulse" : "border-green-500"
                            )}>
                                <span className="text-2xl">🧙‍♂️</span>
                            </div>
                            <div className="mt-1 font-bold text-sm bg-black/50 px-2 rounded">{player1Name}</div>

                            {/* Windup Bar */}
                            {p1.combatPhase === 'CHARGING' && (
                                <div className="w-16 h-1 bg-yellow-500/30 mt-1 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 transition-all duration-100"
                                        style={{ width: `${(p1.windupTimer / (p1.baseWindupTime || 0.5)) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Player 2 */}
                        <div
                            className="absolute bottom-0 w-16 h-32 transition-transform duration-100 flex flex-col items-center"
                            style={{
                                left: `${(p2.position / 20) * 80 + 10}%`,
                                transform: 'translateX(-50%) scaleX(-1)' // Mirror enemy
                            }}
                        >
                            {/* HP Bar (un-mirrored text) */}
                            <div className="w-24 h-4 bg-black/50 rounded-full mb-2 border border-white/10 overflow-hidden relative" style={{ transform: 'scaleX(-1)' }}>
                                <div
                                    className="absolute inset-y-0 left-0 bg-red-500 transition-all duration-100"
                                    style={{ width: `${p2Hp}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold shadow-black drop-shadow-md">
                                    {Math.round(p2.health).toLocaleString()} / {Math.round(p2.maxHealth).toLocaleString()}
                                </div>
                            </div>

                            {/* Avatar */}
                            <div className={cn(
                                "w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-gray-800",
                                p2.combatPhase !== 'IDLE' ? "border-red-500 animate-pulse" : "border-red-700"
                            )}>
                                <span className="text-2xl" style={{ transform: 'scaleX(-1)' }}>👿</span>
                            </div>
                            <div className="mt-1 font-bold text-sm bg-black/50 px-2 rounded" style={{ transform: 'scaleX(-1)' }}>{player2Name}</div>
                        </div>
                    </div>
                </div>

                {/* Log Panel */}
                <div className="h-48 bg-black/80 border-t border-border p-2 overflow-y-auto font-mono text-xs space-y-1">
                    {snapshot.logs && snapshot.logs.slice().reverse().map((log: any, i: number) => (
                        <div key={i} className={cn(
                            "flex gap-2",
                            log.type === 'damage' ? "text-red-300" :
                                log.type === 'heal' ? "text-green-300" :
                                    log.type === 'skill' ? "text-purple-300" :
                                        log.type === 'critical' ? "text-yellow-300 font-bold" :
                                            log.type === 'win' ? "text-gold font-bold text-lg" :
                                                "text-gray-400"
                        )}>
                            <span className="opacity-50">[{log.time.toFixed(2)}s]</span>
                            <span>{log.message}</span>
                        </div>
                    ))}
                </div>

                {/* Winner Overlay */}
                {winner && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300">
                        <div className="bg-bg-secondary p-8 rounded-2xl border-2 border-accent-primary text-center shadow-2xl">
                            <h2 className="text-4xl font-bold mb-2 text-accent-primary">
                                {winner === 'tie' ? 'DRAW!' : `${winner === 'player1' ? player1Name : player2Name} WINS!`}
                            </h2>
                            <p className="text-text-muted mb-6">
                                {winner === 'tie' ? 'Time limit reached with equal HP loss' :
                                    snapshot.timeout ? 'Won by HP% after 60s timeout' : 'Victory by Knockout'}
                            </p>
                            <div className="flex gap-4 justify-center">
                                <Button size="lg" onClick={initBattle}>
                                    <RotateCcw className="w-5 h-5 mr-2" /> Replay
                                </Button>
                                <Button size="lg" variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
