import { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { useProfile } from '../context/ProfileContext';
import { useGameData } from '../hooks/useGameData';
import { cn } from '../lib/utils';
import { FlaskConical, Hammer, Zap, Info, X, RefreshCw, Star } from 'lucide-react';
import { getTechNodeName, getTechNodeDescription } from '../utils/techUtils';
import { useTreeMode } from '../context/TreeModeContext';

const ICON_SIZE = 48;
const NODE_HEIGHT = 140;
const NODE_WIDTH = 200;
const LAYER_GAP = 80;
const COL_GAP = 40;

type TreeName = 'Forge' | 'Power' | 'SkillsPetTech';

export default function TechTree() {
    const { profile } = useProfile();
    const { treeMode } = useTreeMode();
    const { data: treeMapping, loading: l1 } = useGameData<any>('TechTreeMapping.json');
    const { data: treeEffects, loading: l2 } = useGameData<any>('TechTreeLibrary.json');

    const [activeTab, setActiveTab] = useState<TreeName>('Forge');
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

    // Local simulation state - NOT synced to profile
    const [localRanks, setLocalRanks] = useState<Record<number, number>>({});

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const loading = l1 || l2;

    // Get tree data from mapping
    const treesData = useMemo(() => treeMapping?.trees || {}, [treeMapping]);
    const treeKeys = Object.keys(treesData);

    // Get all nodes for active tree
    const { nodes, nodeById, layers } = useMemo(() => {
        const tree = treesData[activeTab];
        const all = (tree?.nodes as any[]) || [];
        const byId: Record<number, any> = {};
        const layerMap: Record<number, any[]> = {};

        all.forEach(n => {
            byId[n.id] = n;
            if (!layerMap[n.layer]) layerMap[n.layer] = [];
            layerMap[n.layer].push(n);
        });

        return { nodes: all, nodeById: byId, layers: layerMap };
    }, [treesData, activeTab]);

    // Preload local simulation based on global Tree Mode (Header selection)
    useEffect(() => {
        const profileData = profile.techTree[activeTab] || {};
        const newState: Record<number, number> = {};

        nodes.forEach(n => {
            if (treeMode === 'max') {
                const effect = treeEffects?.[n.type];
                newState[n.id] = effect?.MaxLevel || 5;
            } else if (treeMode === 'empty') {
                newState[n.id] = 0;
            } else {
                newState[n.id] = profileData[n.id] || 0;
            }
        });
        setLocalRanks(newState);
    }, [activeTab, nodes, profile.techTree, treeMode, treeEffects]);

    // Calculate actual tree dimensions
    const treeDimensions = useMemo(() => {
        const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);
        const height = (layerKeys.length) * (NODE_HEIGHT + LAYER_GAP) + 100;
        const maxNodesInLayer = Math.max(...Object.values(layers).map(l => (l as any[]).length), 1);
        const width = maxNodesInLayer * (NODE_WIDTH + COL_GAP) + 600;
        return { width, height };
    }, [layers]);

    // Calculate positions for graph
    const nodePositions = useMemo(() => {
        const positions: Record<number, { x: number; y: number }> = {};
        const sortedLayers = Object.keys(layers).map(Number).sort((a, b) => a - b);

        sortedLayers.forEach((layer, layerIdx) => {
            const nodesInLayer = layers[layer] as any[];
            const totalWidth = nodesInLayer.length * (NODE_WIDTH + COL_GAP) - COL_GAP;
            const startX = -totalWidth / 2;

            nodesInLayer.forEach((node: any, nodeIdx: number) => {
                positions[node.id] = {
                    x: startX + nodeIdx * (NODE_WIDTH + COL_GAP) + NODE_WIDTH / 2,
                    y: layerIdx * (NODE_HEIGHT + LAYER_GAP) + 50
                };
            });
        });

        return positions;
    }, [layers]);

    const getSpriteStyle = (node: any) => {
        if (!treeMapping || !node?.sprite_rect) return null;
        const { x, y, width, height } = node.sprite_rect;
        const sheetW = treeMapping.texture_size?.width || 1024;
        const sheetH = treeMapping.texture_size?.height || 1024;
        const scale = ICON_SIZE / width;
        const cssY = sheetH - y - height;

        return {
            backgroundImage: `url(./Texture2D/TechTreeIcons.png)`,
            backgroundPosition: `-${x * scale}px -${cssY * scale}px`,
            backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
            width: `${ICON_SIZE}px`,
            height: `${ICON_SIZE}px`,
        };
    };

    // Auto-center
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const scrollX = (container.scrollWidth - container.clientWidth) / 2;
                container.scrollTo({ left: scrollX, behavior: 'auto' });
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [activeTab, loading, treeDimensions]);

    const handleLocalUpdate = (nodeId: number, delta: number) => {
        const node = nodeById[nodeId];
        if (!node) return;

        const currentRank = localRanks[nodeId] || 0;
        const effect = treeEffects?.[node.type];
        const max = effect?.MaxLevel || 1;
        const newVal = Math.max(0, Math.min(max, currentRank + delta));

        // Validation 1: Upgrading requires all requirements to be >= 1
        if (delta > 0 && newVal > 0) {
            const missingReqs = (node.requirements || []).filter((reqId: number) => (localRanks[reqId] || 0) <= 0);
            if (missingReqs.length > 0) {
                // Potential toast or feedback could go here
                return;
            }
        }

        setLocalRanks(prev => {
            const newState = { ...prev, [nodeId]: newVal };

            // Validation 2: If downgraded to 0, prune all dependent nodes recursively (DFS)
            if (newVal === 0) {
                const pruneDescendants = (parentId: number) => {
                    nodes.forEach(n => {
                        if (n.requirements?.includes(parentId) && newState[n.id] > 0) {
                            newState[n.id] = 0;
                            pruneDescendants(n.id);
                        }
                    });
                };
                pruneDescendants(nodeId);
            }

            return newState;
        });
    };

    const maxOutTree = () => {
        const newState = { ...localRanks };
        nodes.forEach(n => {
            const max = treeEffects?.[n.type]?.MaxLevel || 1;
            newState[n.id] = max;
        });
        setLocalRanks(newState);
    };

    const resetToProfile = () => {
        const profileData = profile.techTree[activeTab] || {};
        const newState: Record<number, number> = {};
        nodes.forEach(n => {
            newState[n.id] = profileData[n.id] || 0;
        });
        setLocalRanks(newState);
    };

    const selectedNode = selectedNodeId !== null ? (nodeById[selectedNodeId] as any) : null;
    const selectedEffect = selectedNode ? treeEffects?.[selectedNode.type] : null;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in relative overflow-hidden">
            {/* Wiki Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border pb-4 mb-4 shrink-0 px-2 sm:px-0">
                <div className="flex items-center gap-3 self-start md:self-center">
                    <FlaskConical className="w-8 h-8 sm:w-10 sm:h-10 text-accent-primary" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                            Tech Wiki
                        </h1>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Research Simulation & Library</p>
                    </div>
                </div>

                <div className="flex gap-1 bg-bg-secondary/30 p-1 rounded-xl border border-border overflow-x-auto max-w-full no-scrollbar">
                    {treeKeys.map((treeKey) => (
                        <button
                            key={treeKey}
                            onClick={() => {
                                setActiveTab(treeKey as TreeName);
                                setSelectedNodeId(null);
                                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap",
                                activeTab === treeKey
                                    ? "bg-accent-primary text-white shadow-lg"
                                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                            )}
                        >
                            {treeKey}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simulation Controls */}
            <Card className="p-2 mb-4 flex flex-wrap items-center justify-between gap-3 border-accent-primary/20 shrink-0 bg-accent-primary/5">
                <div className="flex items-center gap-2 px-2 py-1">
                    <Info className="w-4 h-4 text-accent-primary" />
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Simulation Mode</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={resetToProfile}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-input border border-border hover:bg-white/5 text-[11px] font-bold transition-all"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Reload My Tree
                    </button>
                    <button
                        onClick={maxOutTree}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-primary/20 border border-accent-primary/30 hover:bg-accent-primary/30 text-accent-primary text-[11px] font-bold transition-all"
                    >
                        <Star className="w-3 h-3 fill-current" />
                        Max Everything
                    </button>
                </div>
            </Card>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                    <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <span className="font-bold text-text-muted uppercase tracking-widest text-sm">Decoding Tech Mapping...</span>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden relative border border-border rounded-2xl bg-bg-secondary/10 backdrop-blur-sm">
                    {/* Tree Viewport */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto relative custom-scrollbar select-none touch-pan-x touch-pan-y"
                    >
                        <div
                            className="relative"
                            style={{
                                width: `${treeDimensions.width}px`,
                                height: `${treeDimensions.height}px`
                            }}
                        >
                            {/* SVG Connections Layer */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                                <defs>
                                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                                        <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
                                    </linearGradient>
                                </defs>
                                {nodes.map(node => {
                                    const toPos = nodePositions[node.id];
                                    return (node.requirements || []).map((reqId: number) => {
                                        const fromPos = nodePositions[reqId];
                                        if (!fromPos || !toPos) return null;

                                        const startX = fromPos.x + (treeDimensions.width / 2);
                                        const startY = fromPos.y + NODE_HEIGHT / 2;
                                        const endX = toPos.x + (treeDimensions.width / 2);
                                        const endY = toPos.y - 10;
                                        const cpY = startY + (endY - startY) / 2;

                                        return (
                                            <path
                                                key={`${reqId}-${node.id}`}
                                                d={`M ${startX} ${startY} C ${startX} ${cpY}, ${endX} ${cpY}, ${endX} ${endY}`}
                                                stroke="url(#lineGrad)"
                                                strokeWidth="2"
                                                fill="none"
                                            />
                                        );
                                    });
                                })}
                            </svg>

                            {/* Nodes Layer */}
                            {nodes.map(node => {
                                const pos = nodePositions[node.id];
                                const currentRank = localRanks[node.id] || 0;
                                const effect = treeEffects?.[node.type];
                                const maxLevel = effect?.MaxLevel || 1;
                                const spriteStyle = getSpriteStyle(node);
                                const isSelected = selectedNodeId === node.id;
                                const isResearched = currentRank > 0;

                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => setSelectedNodeId(node.id)}
                                        className={cn(
                                            "absolute cursor-pointer transition-all duration-300 transform outline-none",
                                            isSelected ? "z-30 scale-110" : "z-10 hover:scale-105"
                                        )}
                                        style={{
                                            left: `${pos.x + (treeDimensions.width / 2) - NODE_WIDTH / 2}px`,
                                            top: `${pos.y - NODE_HEIGHT / 2}px`,
                                            width: `${NODE_WIDTH}px`
                                        }}
                                    >
                                        <Card className={cn(
                                            "p-3 h-full flex flex-col items-center text-center gap-2 border-2 transition-colors",
                                            isSelected ? "border-accent-primary bg-accent-primary/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]" :
                                                isResearched ? "border-accent-primary/40 bg-accent-primary/5" : "border-border/50 bg-bg-primary/50"
                                        )}>
                                            <div className="w-16 h-16 rounded-xl bg-bg-input border border-border flex items-center justify-center relative overflow-hidden group">
                                                {spriteStyle ? (
                                                    <div style={spriteStyle} />
                                                ) : (
                                                    activeTab === 'Power' ? <Zap className="w-8 h-8 text-yellow-500" /> : <Hammer className="w-8 h-8 text-blue-500" />
                                                )}
                                                {currentRank === maxLevel && (
                                                    <div className="absolute inset-0 border-2 border-accent-primary/30 rounded-lg pointer-events-none" />
                                                )}
                                            </div>

                                            <div className="min-w-0 w-full">
                                                <div className="text-[10px] font-bold text-text-muted uppercase mb-0.5">Tier {node.tier}</div>
                                                <h4 className="text-xs font-bold text-text-primary leading-tight line-clamp-2 min-h-[2.5em]">
                                                    {getTechNodeName(node.type)}
                                                </h4>
                                            </div>

                                            <div className="mt-auto w-full">
                                                <div className="flex items-center justify-between text-[10px] bg-bg-input rounded px-2 py-1 border border-border/50">
                                                    <span className="text-text-muted">Simulate</span>
                                                    <span className={cn("font-mono font-bold", isResearched ? "text-accent-primary" : "text-text-muted")}>
                                                        {currentRank}/{maxLevel}
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detail Panel (Slide-in) */}
                    <div className={cn(
                        "absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-bg-primary border-l border-border shadow-2xl z-40 transition-transform duration-300 overflow-y-auto",
                        selectedNode ? "translate-x-0" : "translate-x-full"
                    )}>
                        {selectedNode && (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold">Node Simulation</h3>
                                    <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-white/10 rounded-full">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 bg-bg-secondary/50 p-4 rounded-2xl border border-border">
                                    <div className="w-16 h-16 rounded-xl bg-bg-input border border-border flex items-center justify-center shrink-0">
                                        {(() => {
                                            const spriteStyle = getSpriteStyle(selectedNode);
                                            return spriteStyle ? (
                                                <div style={spriteStyle} />
                                            ) : (
                                                activeTab === 'Power' ? <Zap className="w-8 h-8 text-yellow-500" /> : <Hammer className="w-8 h-8 text-blue-500" />
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-accent-primary uppercase">{activeTab} Tech</div>
                                        <h2 className="text-lg font-bold leading-tight">{getTechNodeName(selectedNode.type)}</h2>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Function</label>
                                        <p className="text-sm text-text-secondary leading-relaxed bg-accent-primary/5 p-3 rounded-lg border border-accent-primary/20 italic">
                                            "{getTechNodeDescription(selectedNode.type, selectedEffect)}"
                                        </p>
                                    </div>

                                    {/* SIMULATION RANK CONTROL */}
                                    <div>
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3 block">Simulate Rank</label>
                                        <div className="flex items-center gap-4 bg-bg-input rounded-2xl p-2 border border-border">
                                            <button
                                                onClick={() => handleLocalUpdate(selectedNode.id, -1)}
                                                className="w-10 h-10 rounded-xl bg-bg-secondary hover:bg-white/5 flex items-center justify-center font-bold text-xl transition-colors"
                                            >-</button>
                                            <div className="flex-1 text-center">
                                                <div className="text-2xl font-mono font-bold text-accent-primary">
                                                    {localRanks[selectedNode.id] || 0}
                                                </div>
                                                <div className="text-[9px] text-text-muted uppercase font-bold tracking-tighter">Level Rank</div>
                                            </div>
                                            <button
                                                onClick={() => handleLocalUpdate(selectedNode.id, 1)}
                                                className="w-10 h-10 rounded-xl bg-bg-secondary hover:bg-white/5 flex items-center justify-center font-bold text-xl transition-colors"
                                            >+</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Bonus Analytics</label>
                                        {selectedEffect?.Stats?.map((stat: any, i: number) => {
                                            const currentVal = localRanks[selectedNode.id] || 0;
                                            const maxLevel = selectedEffect.MaxLevel || 1;

                                            return (
                                                <div key={i} className="bg-bg-input/50 rounded-xl border border-border p-4 space-y-3">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-text-muted font-bold">{stat.StatNode?.UniqueStat?.StatType}</span>
                                                        <span className="font-mono bg-accent-secondary/20 text-accent-secondary px-2 py-0.5 rounded text-[10px]">
                                                            {stat.StatNode?.UniqueStat?.StatNature}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Simulated Rank</div>
                                                            <div className="text-base font-mono font-bold text-accent-primary">
                                                                {stat.StatNode?.UniqueStat?.StatNature === 'Additive'
                                                                    ? `+${(stat.Value * currentVal).toFixed(1)}`
                                                                    : `+${(stat.Value * currentVal * 100).toFixed(2)}%`
                                                                }
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-text-muted uppercase font-bold mb-1">Node Max</div>
                                                            <div className="text-base font-mono font-bold text-text-muted opacity-50">
                                                                {stat.StatNode?.UniqueStat?.StatNature === 'Additive'
                                                                    ? `+${(stat.Value * maxLevel).toFixed(1)}`
                                                                    : `+${(stat.Value * maxLevel * 100).toFixed(2)}%`
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Node Requirements */}
                                {selectedNode.requirements?.length > 0 && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Unlocks after:</label>
                                        <div className="space-y-1.5">
                                            {selectedNode.requirements.map((reqId: number) => {
                                                const reqNode = nodeById[reqId] as any;
                                                if (!reqNode) return null;
                                                return (
                                                    <button
                                                        key={reqId}
                                                        onClick={() => setSelectedNodeId(reqId)}
                                                        className="w-full flex items-center gap-3 p-2 bg-bg-secondary/40 rounded-lg border border-border hover:border-accent-primary transition-colors text-left"
                                                    >
                                                        <Info className="w-4 h-4 text-accent-primary shrink-0" />
                                                        <span className="text-xs font-medium truncate">{getTechNodeName(reqNode.type)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-border mt-4">
                                    <div className="text-[10px] text-text-muted text-center italic leading-tight">
                                        <b>READ ONLY:</b> Individual changes are for simulation only. To update your profile, use the Research panel.
                                    </div>
                                </div>
                            </div>
                        )}

                        {!selectedNode && (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
                                <Info className="w-16 h-16 mb-4" />
                                <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">Select a tech node to view function & simulate stats</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
