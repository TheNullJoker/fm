import { Swords } from 'lucide-react';
import { EnemyBuilder } from '../components/Pvp/EnemyBuilder';

export default function PvpArena() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
            <header>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                    <Swords className="w-8 h-8 text-orange-500" />
                    PVP Arena
                </h1>
                <p className="text-text-secondary mt-2">
                    Build an opponent and simulate a battle against them.
                </p>
            </header>

            <EnemyBuilder />
        </div>
    );
}
