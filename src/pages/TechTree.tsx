import { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { useProfile } from '../context/ProfileContext';
import { useGameData } from '../hooks/useGameData';
import { cn } from '../lib/utils';
import { FlaskConical, Hammer, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const ICON_SIZE = 48;
const NODE_HEIGHT = 100;
const NODE_WIDTH = 180;
const LAYER_GAP = 60;
const COL_GAP = 30;

type TreeName = 'Forge' | 'Power' | 'SkillsPetTech';

export default function TechTree() {
    const { profile, updateProfile } = useProfile();
    const { data: treeMapping, loading: l1 } = useGameData<any>('TechTreeMapping.json');
    const { data: treeEffects, loading: l2 } = useGameData<any>('TechTreeLibrary.json');

    const [activeTab, setActiveTab] = useState<TreeName>('Forge');
    const [selectedTier, setSelectedTier] = useState<number>(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const loading = l1 || l2;

    // Get tree data from mapping
    const treesData = useMemo(() => {
        if (!treeMapping?.trees) return {};
        return treeMapping.trees;
    }, [treeMapping]);

    const treeKeys = Object.keys(treesData);

    // Get nodes for active tree and tier
    const { nodes, nodeById, maxTier } = useMemo(() => {
        const tree = treesData[activeTab];
        if (!tree?.nodes) return { nodes: [], nodeById: {}, maxTier: 0, layers: {} };

        const all = tree.nodes as any[];
        const byId: Record<number, any> = {};
        let max = 0;
        const layerMap: Record<number, any[]> = {};

        all.forEach(n => {
            byId[n.id] = n;
            if (n.tier > max) max = n.tier;
            if (!layerMap[n.layer]) layerMap[n.layer] = [];
            layerMap[n.layer].push(n);
        });

        return { nodes: all, nodeById: byId, maxTier: max, layers: layerMap };
    }, [treesData, activeTab]);

    // Filter nodes by selected tier
    const tierNodes = useMemo(() => {
        return nodes.filter(n => n.tier === selectedTier);
    }, [nodes, selectedTier]);

    // Layers in current tier
    const tierLayers = useMemo(() => {
        const layerMap: Record<number, any[]> = {};
        tierNodes.forEach(n => {
            if (!layerMap[n.layer]) layerMap[n.layer] = [];
            layerMap[n.layer].push(n);
        });
        return layerMap;
    }, [tierNodes]);

    // Get sprite style
    const getSpriteStyle = (node: any) => {
        if (!treeMapping || !node?.sprite_rect) return null;
        const { x, y, width, height } = node.sprite_rect;
        const sheetW = treeMapping.texture_size?.width || 1024;
        const sheetH = treeMapping.texture_size?.height || 1024;

        const scale = ICON_SIZE / width;
        // Unity Y coordinate (0 at bottom) -> CSS (0 at top)
        const cssY = sheetH - y - height;

        return {
            backgroundImage: `url(/Texture2D/TechTreeIcons.png)`,
            backgroundPosition: `-${x * scale}px -${cssY * scale}px`,
            backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
            width: `${ICON_SIZE}px`,
            height: `${ICON_SIZE}px`,
        };
    };

    // Calculate positions for graph
    const nodePositions = useMemo(() => {
        const positions: Record<number, { x: number; y: number }> = {};
        const sortedLayers = Object.keys(tierLayers).map(Number).sort((a, b) => a - b);

        sortedLayers.forEach((layer, layerIdx) => {
            const nodesInLayer = tierLayers[layer];
            const totalWidth = nodesInLayer.length * (NODE_WIDTH + COL_GAP) - COL_GAP;
            const startX = -totalWidth / 2;

            nodesInLayer.forEach((node: any, nodeIdx: number) => {
                positions[node.id] = {
                    x: startX + nodeIdx * (NODE_WIDTH + COL_GAP) + NODE_WIDTH / 2,
                    y: layerIdx * (NODE_HEIGHT + LAYER_GAP)
                };
            });
        });

        return positions;
    }, [tierLayers]);

    // Draw connection lines
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate canvas size
        const sortedLayers = Object.keys(tierLayers).map(Number).sort((a, b) => a - b);
        const totalHeight = sortedLayers.length * (NODE_HEIGHT + LAYER_GAP);
        const maxNodesInLayer = Math.max(...Object.values(tierLayers).map(l => l.length), 1);
        const totalWidth = maxNodesInLayer * (NODE_WIDTH + COL_GAP) + 200;

        canvas.width = totalWidth;
        canvas.height = totalHeight + 50;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const offsetX = totalWidth / 2;
        const offsetY = 25;

        // Draw lines
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 2;

        tierNodes.forEach(node => {
            const toPos = nodePositions[node.id];
            if (!toPos) return;

            (node.requirements || []).forEach((reqId: number) => {
                const reqNode = nodeById[reqId];
                if (!reqNode || reqNode.tier !== selectedTier) return;

                const fromPos = nodePositions[reqId];
                if (!fromPos) return;

                ctx.beginPath();
                ctx.moveTo(fromPos.x + offsetX, fromPos.y + offsetY + NODE_HEIGHT / 2);
                ctx.lineTo(toPos.x + offsetX, toPos.y + offsetY - 10);
                ctx.stroke();
            });
        });
    }, [tierNodes, nodePositions, tierLayers, nodeById, selectedTier]);

    return (
        <div className="max-w-full mx-auto space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <FlaskConical className="w-12 h-12 text-accent-primary" />
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                            Tech Tree
                        </h1>
                        <p className="text-text-muted mt-1">Research upgrades and unlock bonuses.</p>
                    </div>
                </div>
            </div>

            {/* Tree Tabs */}
            <div className="flex gap-4 border-b border-border/50 overflow-x-auto pb-1">
                {treeKeys.map((treeKey) => (
                    <button
                        key={treeKey}
                        onClick={() => { setActiveTab(treeKey as TreeName); setSelectedTier(0); }}
                        className={cn(
                            "px-6 py-3 font-bold text-lg transition-colors border-b-2 whitespace-nowrap",
                            activeTab === treeKey
                                ? "border-accent-primary text-accent-primary"
                                : "border-transparent text-text-muted hover:text-text-primary"
                        )}
                    >
                        {treeKey} Tree
                    </button>
                ))}
            </div>

            {/* Tier Selector */}
            <div className="flex items-center justify-center gap-4 bg-bg-secondary/50 rounded-lg p-3 border border-border">
                <button
                    onClick={() => setSelectedTier(Math.max(0, selectedTier - 1))}
                    disabled={selectedTier === 0}
                    className="p-2 rounded hover:bg-white/10 disabled:opacity-30"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[120px]">
                    <div className="text-xs text-text-muted uppercase">Tier</div>
                    <div className="font-bold text-2xl text-accent-primary">{selectedTier}</div>
                </div>
                <button
                    onClick={() => setSelectedTier(Math.min(maxTier, selectedTier + 1))}
                    disabled={selectedTier >= maxTier}
                    className="p-2 rounded hover:bg-white/10 disabled:opacity-30"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-24">
                    <div className="text-accent-primary animate-spin mb-4 text-4xl">⟳</div>
                    <div className="text-text-muted text-lg animate-pulse">Loading Tech Tree...</div>
                </div>
            ) : (
                <div className="relative overflow-x-auto">
                    {/* Connection Lines Canvas */}
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{ minWidth: '100%' }}
                    />

                    {/* Nodes Grid */}
                    <div className="flex flex-col gap-8 items-center pt-6" style={{ minHeight: '400px' }}>
                        {Object.keys(tierLayers).map(Number).sort((a, b) => a - b).map(layer => (
                            <div key={layer} className="flex gap-4 flex-wrap justify-center">
                                {tierLayers[layer].map((node: any) => {
                                    const effect = treeEffects?.[node.type];
                                    const maxLevel = effect?.MaxLevel || 5;
                                    const currentLevel = profile.techTree[activeTab]?.[node.id] || 0;
                                    const spriteStyle = getSpriteStyle(node);

                                    const handleLevelChange = (newLevel: number) => {
                                        const val = Math.max(0, Math.min(newLevel, maxLevel));
                                        updateProfile({
                                            techTree: {
                                                ...profile.techTree,
                                                [activeTab]: {
                                                    ...profile.techTree[activeTab],
                                                    [node.id]: val
                                                }
                                            }
                                        });
                                    };

                                    return (
                                        <Card key={node.id} className={cn(
                                            "w-44 p-3 relative overflow-hidden transition-all",
                                            currentLevel > 0 ? "border-accent-primary/50 bg-accent-primary/5" : "hover:border-accent-primary/30"
                                        )}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="bg-bg-input rounded-lg border border-border p-1 flex items-center justify-center shrink-0">
                                                    {spriteStyle ? (
                                                        <div style={spriteStyle} />
                                                    ) : (
                                                        activeTab === 'Power'
                                                            ? <Zap className="w-8 h-8 text-yellow-400" />
                                                            : <Hammer className="w-8 h-8 text-blue-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-text-primary leading-tight truncate">
                                                        {node.type.replace(/([A-Z])/g, ' $1').trim()}
                                                    </h4>
                                                    <div className="text-[10px] text-text-muted">ID: {node.id}</div>
                                                </div>
                                            </div>

                                            {/* Level Control */}
                                            <div className="flex items-center justify-between bg-bg-input rounded p-1 border border-border">
                                                <button
                                                    onClick={() => handleLevelChange(currentLevel - 1)}
                                                    className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center font-bold text-sm"
                                                >-</button>
                                                <div className="text-center">
                                                    <span className="font-mono font-bold text-accent-primary">{currentLevel}</span>
                                                    <span className="text-text-muted text-xs">/{maxLevel}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleLevelChange(currentLevel + 1)}
                                                    className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center font-bold text-sm"
                                                >+</button>
                                            </div>

                                            {/* Effect */}
                                            {effect?.Stats && effect.Stats.length > 0 && (
                                                <div className="mt-2 text-[10px] text-text-muted">
                                                    {effect.Stats.slice(0, 1).map((stat: any, i: number) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span>{stat.StatNode?.UniqueStat?.StatType || 'Effect'}</span>
                                                            <span className="font-mono text-accent-secondary">
                                                                +{(stat.Value * currentLevel * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
