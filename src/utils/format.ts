// Format numbers with strict game notation (3 significant digits: e.g., 1.23M, 12.3M, 123M)
export function formatNumber(num: number): string {
    if (num === 0) return "0";
    if (Math.abs(num) < 1000) return Math.floor(num).toLocaleString();

    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const suffixIdx = Math.floor(Math.log10(Math.abs(num)) / 3);
    const actualSuffixIdx = Math.min(suffixIdx, suffixes.length - 1);

    let value = num / Math.pow(10, actualSuffixIdx * 3);

    // Handle rounding up (e.g., 999.9 -> 1.00K)
    if (Math.abs(value) >= 999.95 && actualSuffixIdx < suffixes.length - 1) {
        value /= 1000;
        return value.toFixed(2) + suffixes[actualSuffixIdx + 1];
    }

    if (Math.abs(value) >= 100) return value.toFixed(0) + suffixes[actualSuffixIdx];
    if (Math.abs(value) >= 10) return value.toFixed(1) + suffixes[actualSuffixIdx];
    return value.toFixed(2) + suffixes[actualSuffixIdx];
}

// Format seconds into readable duration
export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${Math.floor(seconds % 60)}s`;
}
