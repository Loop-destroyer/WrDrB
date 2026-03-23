/**
 * ═══════════════════════════════════════════════════════════════════════════
 * tagStore.js — Tag Management + localStorage Persistence
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Manages auto-suggested and custom user tags for wardrobe items.
 * Tags are persisted to localStorage so they survive page reloads
 * and are available for search/filtering in the Vault tab.
 *
 * Tag format: lowercase, prefixed with '#', underscores for spaces
 *   e.g. '#oversized', '#band_tee', '#acid_wash'
 *
 * @module tagStore
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'wrdrb_custom_tags'

// ── Rainbow palette for tag pill colors ─────────────────────────────────────
// Each tag gets a deterministic color from this palette based on its hash
export const TAG_COLORS = [
    { bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.4)', text: '#FF6B6B' },   // coral
    { bg: 'rgba(255,165,0,0.15)', border: 'rgba(255,165,0,0.4)', text: '#FFA500' },   // orange
    { bg: 'rgba(255,215,0,0.15)', border: 'rgba(255,215,0,0.4)', text: '#FFD700' },   // gold
    { bg: 'rgba(0,245,255,0.15)', border: 'rgba(0,245,255,0.4)', text: '#00F5FF' },   // cyan
    { bg: 'rgba(57,255,20,0.15)', border: 'rgba(57,255,20,0.4)', text: '#39FF14' },   // neon green
    { bg: 'rgba(138,43,226,0.15)', border: 'rgba(138,43,226,0.4)', text: '#8A2BE2' },   // purple
    { bg: 'rgba(255,0,110,0.15)', border: 'rgba(255,0,110,0.4)', text: '#FF006E' },   // hot pink
    { bg: 'rgba(100,149,237,0.15)', border: 'rgba(100,149,237,0.4)', text: '#6495ED' },   // cornflower
    { bg: 'rgba(255,182,193,0.15)', border: 'rgba(255,182,193,0.4)', text: '#FFB6C1' },   // pink
    { bg: 'rgba(50,205,50,0.15)', border: 'rgba(50,205,50,0.4)', text: '#32CD32' },   // lime
]

/**
 * Get a deterministic color for a tag based on its content hash.
 * @param {string} tag
 * @returns {{ bg: string, border: string, text: string }}
 */
export function getTagColor(tag) {
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
        hash = ((hash << 5) - hash) + tag.charCodeAt(i)
        hash |= 0
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ── Auto-suggested tags per category ────────────────────────────────────────
export const SUGGESTED_TAGS = {
    Tops: [
        '#oversized', '#fitted', '#cropped', '#printed', '#acid_wash',
        '#graphic', '#vintage', '#streetwear', '#plain', '#henley',
    ],
    // Sub-tags for printed/graphic tees
    Tops_printed: [
        '#band_tee', '#quotes', '#funny', '#anime', '#sports',
        '#logo', '#abstract', '#tie_dye', '#retro',
    ],
    Bottoms: [
        '#skinny', '#baggy', '#cargo', '#distressed', '#high_waist',
        '#denim', '#joggers', '#chinos', '#pleated', '#shorts',
    ],
    Shoes: [
        '#sneakers', '#boots', '#high_tops', '#runners', '#platforms',
        '#loafers', '#slides', '#chunky', '#canvas', '#leather',
    ],
    Bling: [
        '#chain', '#ring', '#watch', '#beanie', '#cap',
        '#sunglasses', '#earrings', '#bracelet', '#pendant',
    ],
    Overlayer: [
        '#puffer', '#denim_jacket', '#bomber', '#windbreaker',
        '#hoodie', '#varsity', '#trench', '#leather_jacket', '#cardigan',
    ],
    'One-Piece': [
        '#midi', '#maxi', '#jumpsuit', '#frock', '#bodycon',
        '#wrap', '#shirt_dress', '#A_line', '#cocktail',
    ],
}

/**
 * Get suggested tags for a given category.
 * Includes printed sub-tags if the item is tagged as printed.
 *
 * @param {string} category — 'Tops', 'Bottoms', 'Shoes', etc.
 * @param {string[]} [currentTags=[]] — already selected tags
 * @returns {string[]}
 */
export function getSuggestedTags(category, currentTags = []) {
    const base = SUGGESTED_TAGS[category] || []
    const hasPrinted = currentTags.some(t => t === '#printed' || t === '#graphic')
    const extra = (category === 'Tops' && hasPrinted)
        ? (SUGGESTED_TAGS.Tops_printed || [])
        : []
    return [...new Set([...base, ...extra])]
}

// ── Custom tag persistence (localStorage) ───────────────────────────────────

/**
 * Load all custom tags from localStorage.
 * @returns {string[]}
 */
export function getCustomTags() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

/**
 * Save a new custom tag to localStorage.
 * Normalizes: lowercases, adds '#' prefix, replaces spaces with '_'.
 *
 * @param {string} tag — raw user input
 * @returns {string} — the normalized tag
 */
export function addCustomTag(tag) {
    let normalized = tag.trim().toLowerCase().replace(/\s+/g, '_')
    if (!normalized.startsWith('#')) normalized = '#' + normalized
    const existing = getCustomTags()
    if (!existing.includes(normalized)) {
        existing.push(normalized)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    }
    return normalized
}

/**
 * Get all tags (suggested + custom) for a category.
 * @param {string} category
 * @param {string[]} [currentTags=[]]
 * @returns {string[]}
 */
export function getAllTags(category, currentTags = []) {
    const suggested = getSuggestedTags(category, currentTags)
    const custom = getCustomTags()
    return [...new Set([...suggested, ...custom])]
}
