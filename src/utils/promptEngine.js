/**
 * ═══════════════════════════════════════════════════════════════════════════
 * promptEngine.js — Outfit Suggestion Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Processes user prompts and returns weighted wardrobe selections
 * with human-readable explanations for each choice.
 *
 * Pipeline:
 *   1. Extract keywords from prompt
 *   2. Score each item against extracted intents
 *   3. Pick highest-scoring item per category
 *   4. Generate explanation text + color harmony notes
 *
 * @module promptEngine
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Keyword dictionaries ────────────────────────────────────────────────────

const WEATHER = {
    cold: { words: ['cold', 'freezing', 'winter', 'snow', 'chilly', 'frost'], boost: { Overlayer: 40, Tops: 10 }, penalize: { 'shorts': -30 } },
    rainy: { words: ['rain', 'rainy', 'wet', 'drizzle', 'monsoon', 'storm'], boost: { Overlayer: 35, Shoes: 15 }, penalize: { 'canvas': -25, 'slides': -30 } },
    hot: { words: ['hot', 'sunny', 'summer', 'beach', 'heat', 'warm'], boost: {}, penalize: { Overlayer: -30, 'puffer': -40 }, prefer: { shorts: 20, cropped: 15 } },
    wind: { words: ['windy', 'breezy', 'wind'], boost: { Overlayer: 20 }, penalize: {} },
}

const OCCASIONS = {
    casual: { words: ['casual', 'chill', 'relax', 'lazy', 'lounge', 'home'], archetypes: ['Casual', 'Streetwear'], score: 15 },
    formal: { words: ['formal', 'office', 'meeting', 'interview', 'work', 'business'], archetypes: ['Minimalist', 'Prep', 'Chic', 'Elegant'], score: 20 },
    date: { words: ['date', 'dinner', 'romantic', 'night out', 'drinks'], archetypes: ['Chic', 'Elegant', 'Minimalist', 'Boho'], score: 20 },
    party: { words: ['party', 'club', 'concert', 'festival', 'rave'], archetypes: ['Hypebeast', 'Streetwear', 'Techwear'], score: 18 },
    gym: { words: ['gym', 'workout', 'exercise', 'run', 'sport', 'training'], archetypes: ['Casual'], score: 15, tagBoost: ['#joggers', '#runners', '#sneakers', '#fitted'] },
    street: { words: ['street', 'urban', 'skate', 'hip hop', 'drip'], archetypes: ['Streetwear', 'Hypebeast', 'OG'], score: 20 },
}

const COLOR_INTENTS = {
    dark: { words: ['dark', 'black', 'moody', 'goth', 'noir', 'edgy'], maxLuminance: 80 },
    light: { words: ['light', 'white', 'bright', 'pastel', 'clean'], minLuminance: 150 },
    bold: { words: ['colorful', 'bold', 'vibrant', 'pop', 'loud'], minSaturation: 100 },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse hex color to RGB */
function hexToRgb(hex) {
    const h = hex?.replace('#', '') || '888888'
    const r = parseInt(h.substring(0, 2), 16) || 128
    const g = parseInt(h.substring(2, 4), 16) || 128
    const b = parseInt(h.substring(4, 6), 16) || 128
    return { r, g, b }
}

/** Luminance (perceived brightness) 0-255 */
function luminance(hex) {
    const { r, g, b } = hexToRgb(hex)
    return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Saturation approximation 0-255 */
function saturation(hex) {
    const { r, g, b } = hexToRgb(hex)
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    return max - min
}

/** Color name from hex (rough) */
function colorName(hex) {
    const lum = luminance(hex)
    const sat = saturation(hex)
    if (lum > 200 && sat < 30) return 'white'
    if (lum < 40) return 'black'
    if (sat < 30) return lum > 120 ? 'light gray' : 'dark gray'
    const { r, g, b } = hexToRgb(hex)
    if (r > g && r > b) return sat > 100 ? 'red' : 'warm tone'
    if (g > r && g > b) return 'green'
    if (b > r && b > g) return 'blue'
    if (r > 200 && g > 150) return 'gold'
    return 'mixed'
}

/** Check if two colors complement each other */
function colorsHarmonize(hex1, hex2) {
    const l1 = luminance(hex1), l2 = luminance(hex2)
    const contrast = Math.abs(l1 - l2)
    if (contrast > 80) return { harmonizes: true, reason: 'high contrast creates visual pop' }
    if (contrast < 30) return { harmonizes: true, reason: 'tonal match for a cohesive look' }
    return { harmonizes: true, reason: 'balanced mid-tone pairing' }
}

// ── Core scoring ────────────────────────────────────────────────────────────

/**
 * Score a single wardrobe item against extracted prompt intents.
 * @param {Object} item — wardrobe item
 * @param {Object} intents — { weather, occasions, colorIntent, promptWords }
 * @returns {number} score (higher = better match)
 */
function scoreItem(item, intents) {
    let score = item.stylePoints || 50 // base score from style points

    // Weather boosts/penalties
    for (const w of intents.weather) {
        const weatherData = WEATHER[w]
        if (!weatherData) continue
        // Category boost
        if (weatherData.boost[item.category]) score += weatherData.boost[item.category]
        // Tag penalties
        if (item.tags) {
            for (const [penaltyTag, penalty] of Object.entries(weatherData.penalize || {})) {
                if (penaltyTag === item.category) score += penalty
                if (item.tags.some(t => t.includes(penaltyTag))) score += penalty
            }
        }
        // Tag preferences
        if (weatherData.prefer && item.tags) {
            for (const [prefTag, bonus] of Object.entries(weatherData.prefer)) {
                if (item.tags.some(t => t.includes(prefTag))) score += bonus
            }
        }
    }

    // Occasion archetype matching
    for (const occ of intents.occasions) {
        const occasionData = OCCASIONS[occ]
        if (!occasionData) continue
        if (occasionData.archetypes.includes(item.archetype)) score += occasionData.score
        // Tag boosts
        if (occasionData.tagBoost && item.tags) {
            for (const tag of occasionData.tagBoost) {
                if (item.tags.includes(tag)) score += 10
            }
        }
    }

    // Color intent
    if (intents.colorIntent) {
        const ci = COLOR_INTENTS[intents.colorIntent]
        if (ci) {
            const lum = luminance(item.color)
            const sat = saturation(item.color)
            if (ci.maxLuminance && lum <= ci.maxLuminance) score += 15
            if (ci.minLuminance && lum >= ci.minLuminance) score += 15
            if (ci.minSaturation && sat >= ci.minSaturation) score += 15
        }
    }

    // Direct tag match from prompt words
    if (item.tags) {
        for (const word of intents.promptWords) {
            if (item.tags.some(t => t.replace('#', '').includes(word))) score += 12
        }
    }

    // Direct archetype match from prompt words
    if (item.archetype) {
        for (const word of intents.promptWords) {
            if (item.archetype.toLowerCase().includes(word)) score += 15
        }
    }

    // Boost real/uploaded items (identified by local path)
    if (item.image?.startsWith('/apparel/')) {
        score += 50 
    }

    return score
}

/**
 * Extract intents from a prompt string.
 * @param {string} prompt
 * @returns {{ weather: string[], occasions: string[], colorIntent: string|null, promptWords: string[] }}
 */
function extractIntents(prompt) {
    const lower = prompt.toLowerCase()
    const words = lower.split(/\s+/).map(w => w.replace(/[^a-z0-9_]/g, ''))

    const weather = []
    for (const [key, data] of Object.entries(WEATHER)) {
        if (data.words.some(w => lower.includes(w))) weather.push(key)
    }

    const occasions = []
    for (const [key, data] of Object.entries(OCCASIONS)) {
        if (data.words.some(w => lower.includes(w))) occasions.push(key)
    }

    let colorIntent = null
    for (const [key, data] of Object.entries(COLOR_INTENTS)) {
        if (data.words.some(w => lower.includes(w))) { colorIntent = key; break }
    }

    return { weather, occasions, colorIntent, promptWords: words }
}

/**
 * Generate explanation for why an item was picked.
 * @param {Object} item
 * @param {Object} intents
 * @returns {string}
 */
function generateReason(item, intents) {
    const parts = []

    // Weather context
    for (const w of intents.weather) {
        if (w === 'cold' && item.category === 'Overlayer') parts.push(`${item.name} keeps you warm`)
        if (w === 'cold' && item.category === 'Tops') parts.push(`Layering piece for cold weather`)
        if (w === 'rainy' && item.category === 'Overlayer') parts.push(`Water-resistant outer layer`)
        if (w === 'rainy' && item.category === 'Shoes') parts.push(`${item.name} handle wet conditions`)
        if (w === 'hot' && item.category !== 'Overlayer') parts.push(`Breathable for warm weather`)
    }

    // Occasion
    for (const occ of intents.occasions) {
        const data = OCCASIONS[occ]
        if (data?.archetypes.includes(item.archetype)) {
            parts.push(`${item.archetype} style fits the ${occ} vibe`)
        }
    }

    // Style points
    if (item.stylePoints >= 90) parts.push(`High drip score (${item.stylePoints} XP)`)

    // Fallback
    if (parts.length === 0) parts.push(`Versatile ${item.category.toLowerCase()} pick`)

    return parts.join('. ') + '.'
}


// ═══════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a prompt and produce scored, filtered wardrobe selections
 * with explanations.
 *
 * @param {string} prompt — natural language outfit request
 * @param {Object} wardrobe — { tops, bottoms, shoes, overlayers, onePieces }
 * @param {Object} [options={}] — { includeOverlayer: boolean }
 * @returns {{
 *   pools: { tops, bottoms, shoes, overlayers },
 *   explanation: { top, bottom, shoes, overlayer? },
 *   prompted: boolean
 * }}
 */
export function processPrompt(prompt, wardrobe, options = {}) {
    const trimmed = (prompt || '').trim()

    // No prompt → return everything unfiltered
    if (!trimmed) {
        return { pools: wardrobe, explanation: null, prompted: false }
    }

    const intents = extractIntents(trimmed)

    // Score and sort each category
    const score = (items) => {
        return [...items]
            .map(item => ({ item, score: scoreItem(item, intents) }))
            .sort((a, b) => b.score - a.score)
    }

    const topScored = score(wardrobe.tops)
    const bottomScored = score(wardrobe.bottoms)
    const shoeScored = score(wardrobe.shoes)
    const olScored = score(wardrobe.overlayers || [])

    // Pick best item from each category
    const topPick = topScored[0]?.item
    const bottomPick = bottomScored[0]?.item
    const shoesPick = shoeScored[0]?.item
    const olPick = olScored[0]?.item

    // Generate color harmony notes
    const topBottomHarmony = topPick && bottomPick
        ? colorsHarmonize(topPick.color, bottomPick.color)
        : null

    // Build explanation
    const explanation = {
        summary: `Outfit for "${trimmed}"`,
        top: topPick ? {
            item: topPick,
            reason: generateReason(topPick, intents),
            colorNote: `${colorName(topPick.color)} ${topBottomHarmony ? '— ' + topBottomHarmony.reason + ' with bottoms' : ''}`,
        } : null,
        bottom: bottomPick ? {
            item: bottomPick,
            reason: generateReason(bottomPick, intents),
            colorNote: `${colorName(bottomPick.color)} tone`,
        } : null,
        shoes: shoesPick ? {
            item: shoesPick,
            reason: generateReason(shoesPick, intents),
            colorNote: `${colorName(shoesPick.color)} completes the look`,
        } : null,
        overlayer: olPick && (options.includeOverlayer || intents.weather.length > 0) ? {
            item: olPick,
            reason: generateReason(olPick, intents),
            colorNote: `${colorName(olPick.color)} layer`,
        } : null,
    }

    // Return sorted pools (full arrays, best first) so the reel lands on the best match
    return {
        pools: {
            tops: topScored.map(s => s.item),
            bottoms: bottomScored.map(s => s.item),
            shoes: shoeScored.map(s => s.item),
            overlayers: olScored.map(s => s.item),
        },
        explanation,
        prompted: true,
        shouldOverlayer: intents.weather.includes('cold') || intents.weather.includes('rainy') || intents.weather.includes('wind'),
    }
}
