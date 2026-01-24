
/**
 * Helper to calculate Tech Tree modifiers for an imported profile
 */
function calculateTreeModifiers(profile: any, techTreeLibrary: any, techTreePositionLibrary: any): Record<string, number> {
    if (!profile.techTree || !techTreeLibrary || !techTreePositionLibrary) return {};

    const modifiers: Record<string, number> = {};
    const trees = ['Forge', 'Power', 'SkillsPetTech'];
    const validityCache = new Map<number, boolean>();

    const checkNodeValidity = (
        treeData: any,
        levels: Record<string, number>,
        nodeId: number,
        visited: Set<number> = new Set()
    ): boolean => {
        if (validityCache.has(nodeId)) return validityCache.get(nodeId)!;
        if (visited.has(nodeId)) return false;

        const level = levels[nodeId];
        if (!level || level <= 0) {
            validityCache.set(nodeId, false);
            return false;
        }

        const node = treeData.Nodes.find((n: any) => n.Id === nodeId);
        if (!node) {
            validityCache.set(nodeId, false);
            return false;
        }

        visited.add(nodeId);

        if (node.Requirements && node.Requirements.length > 0) {
            for (const reqId of node.Requirements) {
                if (!checkNodeValidity(treeData, levels, reqId, visited)) {
                    visited.delete(nodeId);
                    validityCache.set(nodeId, false);
                    return false;
                }
            }
        }

        visited.delete(nodeId);
        validityCache.set(nodeId, true);
        return true;
    };

    for (const tree of trees) {
        const treeLevels = profile.techTree[tree] || {};
        const treeData = techTreePositionLibrary[tree];
        if (!treeData?.Nodes) continue;

        validityCache.clear();

        for (const [nodeIdStr, level] of Object.entries(treeLevels)) {
            const lvl = Number(level);
            if (lvl <= 0) continue;
            const nodeId = parseInt(nodeIdStr);

            if (checkNodeValidity(treeData, treeLevels, nodeId)) {
                const node = treeData.Nodes.find((n: any) => n.Id === nodeId);
                if (!node) continue;

                const nodeData = techTreeLibrary[node.Type];
                if (!nodeData?.Stats) continue;

                const baseVal = nodeData.Stats[0]?.Value || 0;
                const increment = nodeData.Stats[0]?.ValueIncrease || 0;
                const totalVal = baseVal + (Math.max(0, lvl - 1) * increment);

                const key = node.Type;
                modifiers[key] = (modifiers[key] || 0) + totalVal;
            }
        }
    }

    return modifiers;
}
