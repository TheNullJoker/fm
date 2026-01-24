import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Rarity color RGB values (matching CSS variables in index.css)
const RARITY_COLORS: Record<string, string> = {
    common: '241, 241, 241',
    rare: '93, 216, 255',
    epic: '92, 254, 137',
    legendary: '253, 255, 93',
    ultimate: '255, 93, 93',
    mythic: '213, 93, 255',
};

/**
 * Returns inline style object for rarity-colored gradient background
 */
export function getRarityBgStyle(rarity: string): React.CSSProperties {
    const color = RARITY_COLORS[rarity.toLowerCase()] || RARITY_COLORS.common;
    return {
        background: `linear-gradient(135deg, rgba(${color}, 0.3) 0%, rgba(${color}, 0.1) 100%)`,
    };
}

/**
 * Returns inline style object for rarity-colored border
 */
export function getRarityBorderStyle(rarity: string): React.CSSProperties {
    const color = RARITY_COLORS[rarity.toLowerCase()] || RARITY_COLORS.common;
    return {
        borderColor: `rgb(${color})`,
    };
}

// Age color RGB values (matching CSS variables in index.css)
const AGE_COLORS: Record<string, string> = {
    primitive: '241, 241, 241',
    medieval: '93, 216, 255',
    earlymodern: '92, 254, 137',
    modern: '253, 255, 93',
    space: '255, 93, 93',
    interstellar: '213, 93, 255',
    multiverse: '117, 255, 238',
    quantum: '136, 109, 255',
    underworld: '167, 115, 115',
    divine: '255, 158, 13',
};

// Age name to index mapping
const AGE_NAMES = ['primitive', 'medieval', 'earlymodern', 'modern', 'space', 'interstellar', 'multiverse', 'quantum', 'underworld', 'divine'];

/**
 * Returns inline style object for age-colored gradient background
 */
export function getAgeBgStyle(ageIndex: number): React.CSSProperties {
    const ageName = AGE_NAMES[ageIndex] || 'primitive';
    const color = AGE_COLORS[ageName] || AGE_COLORS.primitive;
    return {
        background: `linear-gradient(135deg, rgba(${color}, 0.3) 0%, rgba(${color}, 0.1) 100%)`,
    };
}

/**
 * Returns inline style object for age-colored border
 */
export function getAgeBorderStyle(ageIndex: number): React.CSSProperties {
    const ageName = AGE_NAMES[ageIndex] || 'primitive';
    const color = AGE_COLORS[ageName] || AGE_COLORS.primitive;
    return {
        borderColor: `rgb(${color})`,
    };
}
