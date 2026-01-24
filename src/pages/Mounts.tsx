import { useState, useMemo } from 'react';
import { useGameData } from '../hooks/useGameData';
import { useProfile } from '../context/ProfileContext';
import { Card } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { cn, getRarityBgStyle } from '../lib/utils';
import { Star, Search, Crosshair, Circle } from 'lucide-react';

export default function Mounts() {
    const { profile } = useProfile();
    const { data: mountLibrary, loading: l1 } = useGameData<any>('MountLibrary.json');
    const { data: spriteMapping, loading: l2 } = useGameData<any>('ManualSpriteMapping.json');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRarity, setFilterRarity] = useState<string | null>(null);
    const [globalLevel, setGlobalLevel] = useState(50);

    const loading = l1 || l2;
    const mountsConfig = spriteMapping?.mounts;

    // Build sprite lookup
    const spriteLookup = useMemo(() => {
        if (!mountsConfig?.mapping) return {};
        const lookup: Record<string, { spriteIndex: number; name: string }> = {};
        Object.entries(mountsConfig.mapping).forEach(([idx, info]: [string, any]) => {
            const key = `${info.rarity}_${info.id}`;
            lookup[key] = { spriteIndex: parseInt(idx), name: info.name };
        });
        return lookup;
    }, [mountsConfig]);

    // Check if mount is active in profile
    const isActiveInProfile = (rarity: string, id: number) => {
        return profile.mount.active?.rarity === rarity && profile.mount.active?.id === id;
    };

    // Process Mounts
    const mounts = useMemo(() => {
        if (!mountLibrary) return [];
        return Object.values(mountLibrary)
            .map((mount: any) => {
                const rarity = mount?.MountId?.Rarity || 'Common';
                const id = mount?.MountId?.Id ?? 0;
                const key = `${rarity}_${id}`;
                const spriteInfo = spriteLookup[key];

                return {
                    id,
                    rarity,
                    key,
                    name: spriteInfo?.name || `Mount #${id}`,
                    spriteIndex: spriteInfo?.spriteIndex ?? -1,
                    colliderRadius: mount?.ColliderRadius || 0,
                    unitOffset: mount?.UnitOffset || { X: 0, Y: 0 },
                    centerOfMass: mount?.CenterOfMass || { X: 0, Y: 0 },
                };
            })
            .filter((mount) => {
                const matchSearch = mount.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchRarity = !filterRarity || mount.rarity === filterRarity;
                return matchSearch && matchRarity;
            })
            .sort((a, b) => {
                const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];
                const rDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
                return rDiff !== 0 ? rDiff : a.id - b.id;
            });
    }, [mountLibrary, spriteLookup, searchTerm, filterRarity]);

    // Calculate sprite position
    const getSpriteStyle = (spriteIndex: number) => {
        if (!mountsConfig || spriteIndex < 0) return null;
        const cols = mountsConfig.grid?.columns || 4;
        const spriteW = mountsConfig.sprite_size?.width || 256;
        const spriteH = mountsConfig.sprite_size?.height || 256;
        const sheetW = mountsConfig.texture_size?.width || 1024;
        const sheetH = mountsConfig.texture_size?.height || 1024;

        const col = spriteIndex % cols;
        const row = Math.floor(spriteIndex / cols);
        const x = col * spriteW;
        const y = row * spriteH;

        const scale = 80 / spriteW;

        return {
            backgroundImage: `url(/Texture2D/MountIcons.png)`,
            backgroundPosition: `-${x * scale}px -${y * scale}px`,
            backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
            width: '80px',
            height: '80px',
        };
    };

    const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'];

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent inline-flex items-center gap-3">
                        <Star className="w-8 h-8 text-accent-primary" />
                        Mount Encyclopedia
                    </h1>
                    <p className="text-text-secondary">
                        Complete mount database with stats.
                    </p>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative w-full md:w-40">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-bg-input border border-border rounded-lg px-3 py-2 text-sm"
                        value={filterRarity || ''}
                        onChange={(e) => setFilterRarity(e.target.value || null)}
                    >
                        <option value="">All Rarities</option>
                        {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            {/* Global Level Slider */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-text-secondary whitespace-nowrap">Display Level:</span>
                    <input
                        type="range"
                        min={1}
                        max={100}
                        value={globalLevel}
                        onChange={(e) => setGlobalLevel(parseInt(e.target.value))}
                        className="flex-1 accent-accent-primary"
                    />
                    <span className="font-mono font-bold text-accent-primary w-10 text-center">{globalLevel}</span>
                </div>
            </Card>

            {loading ? (
                <div className="text-center py-12 text-text-muted">Loading Mounts...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mounts.map(mount => {
                        const isActive = isActiveInProfile(mount.rarity, mount.id);
                        const spriteStyle = getSpriteStyle(mount.spriteIndex);

                        return (
                            <Card key={mount.key} variant="hover" className={cn(
                                "p-4 relative overflow-hidden transition-all flex flex-col",
                                isActive ? "border-accent-primary ring-2 ring-accent-primary" : ""
                            )}>
                                {/* Glow */}
                                <div className={cn(
                                    "absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-xl translate-x-8 -translate-y-8",
                                    `bg-rarity-${mount.rarity.toLowerCase()}`
                                )} />

                                {/* Active Badge (read-only) */}
                                {isActive && (
                                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-accent-primary text-white z-20">
                                        <Star className="w-4 h-4 fill-current" />
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div
                                        className="w-20 h-20 rounded-xl flex items-center justify-center border-2 border-border overflow-hidden shrink-0"
                                        style={getRarityBgStyle(mount.rarity)}
                                    >
                                        {spriteStyle ? (
                                            <div style={spriteStyle} />
                                        ) : (
                                            <Star className="w-10 h-10 text-text-muted" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-text-primary text-lg leading-tight truncate">{mount.name}</h3>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 mt-1 inline-block",
                                            `text-rarity-${mount.rarity.toLowerCase()}`
                                        )}>
                                            {mount.rarity}
                                        </span>
                                    </div>
                                </div>

                                {/* Mount Stats */}
                                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                    <div className="bg-bg-input/50 p-2 rounded flex items-center gap-2">
                                        <Circle className="w-3 h-3 text-accent-secondary" />
                                        <span className="text-text-muted">Radius:</span>
                                        <span className="font-mono font-bold ml-auto">{mount.colliderRadius.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-bg-input/50 p-2 rounded flex items-center gap-2">
                                        <Crosshair className="w-3 h-3 text-accent-tertiary" />
                                        <span className="text-text-muted">Offset:</span>
                                        <span className="font-mono font-bold ml-auto text-[10px]">{mount.unitOffset.X.toFixed(1)},{mount.unitOffset.Y.toFixed(1)}</span>
                                    </div>
                                </div>

                                {/* Level Display */}
                                <div className="bg-bg-input/50 rounded-lg p-2 border border-border mt-auto text-center">
                                    <div className="text-[10px] text-text-muted uppercase">Level Preview</div>
                                    <div className="font-bold text-accent-primary">{globalLevel}</div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!loading && mounts.length === 0 && (
                <div className="text-center py-12 text-text-muted">No mounts found matching your search.</div>
            )}
        </div>
    );
}
