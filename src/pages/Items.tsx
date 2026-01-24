import { useState, useMemo } from 'react';
import { getItemImage } from '../utils/itemAssets';
import { useGameData } from '../hooks/useGameData';
import { Card } from '../components/UI/Card';
import { GameIcon } from '../components/UI/GameIcon';
import { Sword, Shield, Anchor, Ghost, Hammer, HelpCircle } from 'lucide-react';
import { cn, getAgeBgStyle } from '../lib/utils';
import { AGES } from '../utils/constants';

const SLOTS = ['Weapon', 'Helmet', 'Armour', 'Gloves', 'Shoes', 'Necklace', 'Ring', 'Belt', 'Legacy'];

export default function Items() {
    const { data: itemLibrary, loading: loadingItemLibrary } = useGameData<any>('ItemBalancingLibrary.json');
    const { data: secondaryParams, loading: loadingSecondaryParams } = useGameData<any>('SecondaryStatItemUnlockLibrary.json');
    const { data: autoMapping, loading: loadingAutoMapping } = useGameData<any>('AutoItemMapping.json');

    // Default to first age (Primitive)
    const [selectedAgeIdx, setSelectedAgeIdx] = useState<number>(0);
    const [selectedSlot, setSelectedSlot] = useState<string>('Weapon');

    const loading = loadingItemLibrary || loadingSecondaryParams || loadingAutoMapping;

    const items = useMemo(() => {
        if (!itemLibrary) return [];
        return Object.values(itemLibrary).filter((item: any) => {
            const iId = item.ItemId;
            // Filter by Age Index (0-9) and Slot
            return iId?.Age === selectedAgeIdx && iId?.Type === selectedSlot;
        }).sort((a: any, b: any) => (a.ItemId?.Idx || 0) - (b.ItemId?.Idx || 0));
    }, [itemLibrary, selectedAgeIdx, selectedSlot]);

    const getIconForSlot = (slot: string) => {
        switch (slot) {
            case 'Weapon': return <Sword className="w-6 h-6" />;
            case 'Helmet': return <Ghost className="w-6 h-6" />;
            case 'Armour': return <Shield className="w-6 h-6" />;
            case 'Gloves': return <Hammer className="w-6 h-6" />;
            case 'Shoes': return <Anchor className="w-6 h-6" />;
            case 'Necklace': return <GameIcon name="star" className="w-6 h-6" />;
            case 'Ring': return <HelpCircle className="w-6 h-6" />; // Need ring icon
            case 'Belt': return <GameIcon name="hammer" className="w-6 h-6" />; // Placeholder
            default: return <GameIcon name="star" className="w-6 h-6" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">

            {/* Header / Age Selector */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent inline-flex items-center gap-3">
                        <Sword className="w-10 h-10 text-accent-primary" />
                        Item Encyclopedia
                    </h1>
                    <p className="text-text-muted mt-1">Browse equipment stats across all ages.</p>
                </div>

                {/* Age Filter Bar */}
                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                    {AGES.map((ageName, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedAgeIdx(idx)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-3 min-w-[100px] rounded-xl border-2 transition-all duration-200",
                                selectedAgeIdx === idx
                                    ? "border-accent-primary bg-accent-primary/10 shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.3)]"
                                    : "border-border bg-bg-secondary hover:border-accent-primary/50 hover:bg-bg-input"
                            )}
                        >
                            {/* Placeholder for Age Image */}
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                                selectedAgeIdx === idx ? "bg-accent-primary text-white" : "bg-bg-input text-text-muted"
                            )}>
                                {idx + 1}
                            </div>
                            <span className={cn(
                                "text-xs font-bold whitespace-nowrap",
                                selectedAgeIdx === idx ? "text-accent-primary" : "text-text-secondary"
                            )}>
                                {ageName}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Slot Filter Bar */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-border/50">
                    {SLOTS.map(slot => (
                        <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                                "px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2",
                                selectedSlot === slot
                                    ? "bg-accent-primary text-white shadow-lg"
                                    : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-input"
                            )}
                        >
                            {getIconForSlot(slot)}
                            {slot}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-24">
                    <div className="text-accent-primary animate-spin mb-4 text-4xl">⟳</div>
                    <div className="text-text-muted text-lg animate-pulse">Forging Items...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.length > 0 ? items.map((item: any, i: number) => {
                        const stats = item.EquipmentStats || [];
                        // We can also extract secondary stat info from SecondaryStatItemUnlockLibrary based on age
                        const secondaryData = secondaryParams?.[String(selectedAgeIdx)];
                        const numSecondary = secondaryData?.NumberOfSecondStats || 0;

                        return (
                            <Card key={i} className="flex flex-col h-full hover:border-accent-primary/50 transition-all duration-300 group overflow-hidden">
                                <div className="p-5 flex-1 space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-16 h-16 rounded-lg border border-border flex items-center justify-center mb-3 group-hover:border-accent-primary transition-colors shrink-0"
                                            style={getAgeBgStyle(selectedAgeIdx)}
                                        >
                                            {getItemImage(AGES[selectedAgeIdx], selectedSlot, item.ItemId?.Idx, autoMapping) ? (
                                                <img
                                                    src={getItemImage(AGES[selectedAgeIdx], selectedSlot, item.ItemId?.Idx, autoMapping)!}
                                                    alt={item.Name}
                                                    className="w-12 h-12 object-contain"
                                                />
                                            ) : (
                                                <span className="text-2xl text-text-muted">?</span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-text-primary group-hover:text-accent-primary transition-colors">
                                                {selectedSlot} {item.ItemId?.Idx + 1}
                                            </h3>
                                            <div className="text-xs text-text-muted flex gap-2 mt-1">
                                                <span className="bg-bg-input px-2 py-0.5 rounded border border-border/50">Idx: {item.ItemId?.Idx}</span>
                                                <span className="bg-bg-input px-2 py-0.5 rounded border border-border/50">{AGES[selectedAgeIdx]}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="space-y-2">
                                        {stats.map((stat: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center bg-bg-input/50 p-2 rounded border border-border/30">
                                                <span className="text-sm text-text-secondary">{stat.StatNode?.UniqueStat?.StatType}</span>
                                                <span className="font-mono font-bold text-text-primary">{stat.Value?.toLocaleString()}</span>
                                            </div>
                                        ))}

                                        {/* Secondary Stats Placeholder */}
                                        {numSecondary > 0 && (
                                            <div className="mt-4 pt-4 border-t border-border/30">
                                                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                                                    Secondary Stats ({numSecondary})
                                                </div>
                                                {Array.from({ length: numSecondary }).map((_, idx) => (
                                                    <div key={idx} className="flex justify-between items-center py-1 text-sm text-text-muted/70">
                                                        <span>Random Stat {idx + 1}</span>
                                                        <span>???</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {stats.length === 0 && numSecondary === 0 && (
                                            <div className="text-center text-xs text-text-muted italic py-8">
                                                No stats available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="col-span-full text-center py-12 bg-bg-secondary/30 rounded-2xl border border-dashed border-border">
                            <div className="text-4xl mb-4 grayscale opacity-50">🛡️</div>
                            <div className="text-text-muted font-medium">No items found for this Age/Slot.</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
