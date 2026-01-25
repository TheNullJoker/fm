import { EnemyBuilder } from '../components/Pvp/EnemyBuilder';

export default function PvpArena() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
            <header>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                    <img src="./Texture2D/TechTreePower.png" alt="Arena" className="w-10 h-10 object-contain" />
                    PVP Simulator
                </h1>
                <p className="text-text-secondary mt-2">
                    Build an opponent and simulate a battle against them.
                </p>
            </header>


            <EnemyBuilder />

            {/* Background Decoration */}
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none overflow-hidden">
                <img src="./Texture2D/TechTreePower.png" alt="" className="w-64 h-64 object-contain grayscale" />
            </div>
        </div>
    );
}
