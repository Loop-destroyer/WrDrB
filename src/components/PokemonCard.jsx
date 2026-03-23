import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Minimize2 } from 'lucide-react'
import { getCondition } from '../data/mockData'

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
    'One-Piece': '#8A2BE2',
    'Bling':     '#4B0082',
    'Bottoms':   '#00BFFF',
    'Overlayer': '#32CD32',
    'Tops':      '#FFD700',
    'Shoes':     '#FF4500',
    'Fit':       '#FF006E',
}

const TYPE_MAPPING = {
    'Streetwear': { icon: '🔥', bg: 'linear-gradient(135deg, #ff4e00, #ec9f05)' },
    'Techwear':   { icon: '⚡', bg: 'linear-gradient(135deg, #fceabb, #f8b500)' },
    'Minimalist': { icon: '💧', bg: 'linear-gradient(135deg, #89f7fe, #66a6ff)' },
    'Classic':    { icon: '⚪', bg: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
    'Grunge':     { icon: '🌑', bg: 'linear-gradient(135deg, #434343, #000000)' },
    'Hypebeast':  { icon: '🌟', bg: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)' },
    'Boho':       { icon: '🌿', bg: 'linear-gradient(135deg, #d4fc79, #96e6a1)' },
    'Prep':       { icon: '🌊', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    'OG':         { icon: '🪨', bg: 'linear-gradient(135deg, #8B4513, #D2B48C)' },
    'Chic':       { icon: '🍷', bg: 'linear-gradient(135deg, #ff0844, #ffb199)' },
    'Elegant':    { icon: '✨', bg: 'linear-gradient(135deg, #BDE0FE, #FFAFCC)' },
    'Casual':     { icon: '☁️', bg: 'linear-gradient(135deg, #fdfbfb, #ebedee)' },
}

const TAG_COLORS = ['#FF006E','#FFD700','#00BFFF','#39FF14','#FF4500','#a688fa','#ff6b6b','#4ecdc4']
const tagColor = (tag) => TAG_COLORS[tag.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % TAG_COLORS.length]

// ════════════════════════════════════════════════════════════════════════════════
// WEAR ENGINE v3 — Realistic Card-Wide Effects
//
// Inspired by actual worn Pokémon card reference images:
//  - Long diagonal scratches spanning the full card face (white glint + dark groove)
//  - Fine grain covering the entire surface
//  - Edge whitening / grime around all 4 perimeters
//  - Corner lift / dark triangular shadows
//  - Overall colour degradation (CSS filter: saturate/sepia/brightness)
//
// Tiers:   0 = pristine (<= 30 uses)
//          1 = light    (31–49)
//          2 = medium   (50–74)
//          3 = heavy    (75–99)
//          4 = vintage  (100+)
// ════════════════════════════════════════════════════════════════════════════════

// Generates the inline SVG string for card-wide wear marks
function buildWearSVG(wornCount) {
    if (wornCount <= 30) return null

    const tier = wornCount < 50 ? 1 : wornCount < 75 ? 2 : wornCount < 100 ? 3 : 4
    const t    = tier === 1 ? (wornCount - 30) / 19
               : tier === 2 ? (wornCount - 50) / 24
               : tier === 3 ? (wornCount - 75) / 24
               : Math.min((wornCount - 100) / 50, 1)

    // Deterministic noise from wornCount seed
    const rng = (salt, range = 1, offset = 0) =>
        offset + ((wornCount * 31 + salt * 17 + salt * salt * 7) % 97) / 97 * range

    // ── 1. Surface grain filter over entire card ──────────────────────────
    const grainOpacity = 0.04 + t * 0.08

    // ── 2. Long diagonal scratches — span full card width/height ─────────
    // A real card scratch runs from one edge to another at a shallow angle.
    // We use start/end points on card edges (0-100 viewBox), not midpoints.
    const scratchCount = tier === 1 ? 2
                       : tier === 2 ? 6
                       : tier === 3 ? 12
                       : 20

    const scratches = Array.from({ length: scratchCount }, (_, i) => {
        // Start on left or top edge
        const useTopEdge = rng(i * 11) > 0.5
        const sx = useTopEdge ? rng(i * 7, 100) : 0
        const sy = useTopEdge ? 0              : rng(i * 13, 100)
        // End on right or bottom edge
        const ex = useTopEdge ? sx + rng(i * 3, 40, -20) : 100 
        const ey = useTopEdge ? 100                       : sy + rng(i * 5, 40, -20)
        // Width scales with tier and intensity
        const w  = tier === 1 ? 0.3 + rng(i, 0.3)
                 : tier === 2 ? 0.4 + rng(i, 0.5)
                 : tier === 3 ? 0.5 + rng(i, 1.0)
                 :              0.6 + rng(i, 1.6)
        // Occasional very thin parallel highlight beside main scratch
        const hx = 0.1 + rng(i * 9, 0.3)
        return { sx, sy, ex, ey, w, hx, i }
    })

    // ── 3. Edge whitening — thin bright band along all 4 card borders ─────
    // On real worn cards the edge paint wears away revealing a lighter layer.
    const edgeW  = 1.5 + t * 2.5   // edge band width in SVG units (out of 100)
    const edgeOp = 0.15 + t * 0.35

    // ── 4. Edge grime — dark vignette behind the edge whitening ───────────
    const grimeW  = 4 + t * 10
    const grimeOp = 0.2 + t * 0.5

    // ── 5. Corner shadows (triangle dark marks) ───────────────────────────
    const cornerSize = 4 + t * 12
    const cornerOp   = 0.35 + t * 0.5

    // ── 6. Random fibre/grain dots for paper surface texture ──────────────
    const dotCount = tier === 1 ? 0 : tier === 2 ? 12 : tier === 3 ? 30 : 55
    const dots = Array.from({ length: dotCount }, (_, i) => ({
        cx: rng(i * 19, 100),
        cy: rng(i * 23, 100),
        r:  0.3 + rng(i * 41, 0.8 * t),
        op: 0.2 + rng(i * 7, 0.5 * t),
    }))

    return {
        tier, t,
        grainOpacity,
        scratches,
        edgeW, edgeOp,
        grimeW, grimeOp,
        cornerSize, cornerOp,
        dots,
    }
}

// Returns the card-level CSS filter string
function wearFilter(wornCount) {
    if (wornCount <= 30)  return 'none'
    const tier = wornCount < 50 ? 1 : wornCount < 75 ? 2 : wornCount < 100 ? 3 : 4
    const t    = tier === 1 ? (wornCount - 30) / 19
               : tier === 2 ? (wornCount - 50) / 24
               : tier === 3 ? (wornCount - 75) / 24
               : Math.min((wornCount - 100) / 50, 1)
    if (tier === 1) return `saturate(${1 - t * 0.12})`
    if (tier === 2) return `saturate(${0.88 - t * 0.18}) brightness(${1 - t * 0.07})`
    if (tier === 3) return `saturate(${0.70 - t * 0.2}) brightness(${0.93 - t * 0.10}) contrast(${1 + t * 0.08})`
    return `saturate(${0.42 - t * 0.2}) sepia(${0.25 + t * 0.45}) brightness(${0.82 - t * 0.14}) contrast(${1.1 + t * 0.1})`
}

// The React component that renders the SVG wear overlay
function WearOverlay({ wornCount }) {
    const data = buildWearSVG(wornCount)
    if (!data) return null

    const { tier, t, grainOpacity, scratches, edgeW, edgeOp, grimeW, grimeOp, cornerSize, cornerOp, dots } = data

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 14, borderRadius: 'inherit' }}
        >
            <defs>
                {/* Turbulence filter for rough ink edges on scratches */}
                <filter id={`rough-${wornCount}`} x="-2%" y="-2%" width="104%" height="104%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed={wornCount} result="noise"/>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale={0.6 + t * 1.2} xChannelSelector="R" yChannelSelector="G"/>
                </filter>
                {/* Fine grain for surface texture — full cover */}
                <filter id={`grain-${wornCount}`} x="0%" y="0%" width="100%" height="100%">
                    <feTurbulence type="turbulence" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="grain"/>
                    <feColorMatrix in="grain" type="saturate" values="0"/>
                    <feBlend in="SourceGraphic" mode="multiply"/>
                </filter>
            </defs>

            {/* ── LAYER 1: Full-card surface grain ── */}
            <rect x="0" y="0" width="100" height="100" fill="rgba(80,60,40,1)"
                filter={`url(#grain-${wornCount})`} opacity={grainOpacity}/>

            {/* ── LAYER 2: Edge grime (dark) — all 4 edges ── */}
            <rect x="0"         y="0"            width="100"   height={grimeW}     fill="rgba(0,0,0,1)" opacity={grimeOp}/>
            <rect x="0"         y={100 - grimeW} width="100"   height={grimeW}     fill="rgba(0,0,0,1)" opacity={grimeOp * 0.85}/>
            <rect x="0"         y="0"            width={grimeW} height="100"        fill="rgba(0,0,0,1)" opacity={grimeOp * 0.9}/>
            <rect x={100-grimeW} y="0"           width={grimeW} height="100"        fill="rgba(0,0,0,1)" opacity={grimeOp * 0.9}/>

            {/* ── LAYER 3: Edge whitening (paint wear) — thin bright band ── */}
            {tier >= 2 && <>
                <rect x="0"         y="0"            width="100"    height={edgeW}     fill="rgba(255,255,255,1)" opacity={edgeOp}/>
                <rect x="0"         y={100 - edgeW}  width="100"    height={edgeW}     fill="rgba(255,255,255,1)" opacity={edgeOp * 0.8}/>
                <rect x="0"         y="0"            width={edgeW}  height="100"       fill="rgba(255,255,255,1)" opacity={edgeOp * 0.85}/>
                <rect x={100-edgeW} y="0"            width={edgeW}  height="100"       fill="rgba(255,255,255,1)" opacity={edgeOp * 0.85}/>
            </>}

            {/* ── LAYER 4: Corner lift shadows ── */}
            <polygon points={`0,0 ${cornerSize},0 0,${cornerSize}`}             fill="rgba(0,0,0,1)" opacity={cornerOp}/>
            <polygon points={`100,0 ${100-cornerSize},0 100,${cornerSize}`}      fill="rgba(0,0,0,1)" opacity={cornerOp * 0.9}/>
            <polygon points={`0,100 ${cornerSize},100 0,${100-cornerSize}`}      fill="rgba(0,0,0,1)" opacity={cornerOp * 0.85}/>
            <polygon points={`100,100 ${100-cornerSize},100 100,${100-cornerSize}`} fill="rgba(0,0,0,1)" opacity={cornerOp}/>

            {/* ── LAYER 5: Full-card diagonal scratches ── */}
            <g filter={`url(#rough-${wornCount})`}>
                {scratches.map(({ sx, sy, ex, ey, w, hx, i }) => (
                    <g key={i}>
                        {/* White glint (wider, offset slightly) */}
                        <line x1={sx - hx} y1={sy} x2={ex - hx} y2={ey}
                            stroke="rgba(255,255,255,0.7)" strokeWidth={w * 1.8}
                            strokeLinecap="round" opacity={0.6 + t * 0.3}/>
                        {/* Dark groove */}
                        <line x1={sx} y1={sy} x2={ex} y2={ey}
                            stroke="rgba(0,0,0,0.9)" strokeWidth={w * 0.8}
                            strokeLinecap="round" opacity={0.7 + t * 0.25}/>
                    </g>
                ))}
            </g>

            {/* ── LAYER 6: Surface fibre dots (paper texture) ── */}
            {dots.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={d.r}
                    fill="rgba(0,0,0,1)" opacity={d.op}/>
            ))}
        </svg>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// HOLO SHINE — simeydotme/pokemon-cards-css technique
//
// CSS custom properties are set as inline vars on the card element:
//   --pointer-x/y         : normalised mouse position 0%–100%
//   --pointer-from-left/top: 0–1 fractions of pointer position
//   --pointer-from-center  : 0–1 distance from centre
//   --card-opacity         : 0 at rest, 1 while hovering
//   --background-x/y       : remapped bg position (37%–63%)
//
// The .card-shine and .card-glare CSS classes (in index.css)
// consume these vars to draw the iridescent foil + specular glare.
// ════════════════════════════════════════════════════════════════════════════════
function HoloShine({ isShiny, hovering, mx, my }) {
    if (!isShiny) return null

    // Clamp helpers
    const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const adj = (v, iLo, iHi, oLo, oHi) => oLo + ((v - iLo) / (iHi - iLo)) * (oHi - oLo)
    const round = (v, p = 2) => parseFloat(v.toFixed(p))

    // mx, my are 0–1 normalised (set on parent via tilt system)
    const px = cl(round(mx * 100), 0, 100)      // 0–100%
    const py = cl(round(my * 100), 0, 100)
    const fromLeft = px / 100                    // 0–1
    const fromTop  = py / 100
    const fromCtr  = cl(
        Math.sqrt((py - 50) ** 2 + (px - 50) ** 2) / 50,
        0, 1
    )
    const bgX = adj(px, 0, 100, 37, 63)
    const bgY = adj(py, 0, 100, 33, 67)
    const opacity = hovering ? 1 : 0

    return (
        <div
            className={`card-holo-shiny${hovering ? ' card-holo-active' : ''}`}
            style={{
                position: 'absolute', inset: 0, borderRadius: 'inherit',
                pointerEvents: 'none', zIndex: 22,
                '--pointer-x': `${px}%`,
                '--pointer-y': `${py}%`,
                '--pointer-from-left': fromLeft,
                '--pointer-from-top':  `${round(fromTop, 4)}turn`,
                '--pointer-from-center': fromCtr,
                '--card-opacity':  opacity,
                '--background-x':  `${round(bgX)}%`,
                '--background-y':  `${round(bgY)}%`,
            }}
        >
            <div className="card-shine"/>
            <div className="card-glare"/>
        </div>
    )
}
// Thick adjacent bands (no gaps) at 45°.
// Three RGB-offset layers animated at different speeds via CSS keyframes.
// SVG feTurbulence smudges the edges for a realistic foil look.
// ════════════════════════════════════════════════════════════════════════════════
function ChromaticWaveOverlay({ id, isShiny }) {
    if (!isShiny) return null

    const filterId = `cwa-${id}`
    // Pitch = 60px: 20px band + 20px band + 20px band = one full repeat
    // All three colour bands are adjacent (touch each other, no gap).
    const bandR = `repeating-linear-gradient(
        45deg,
        rgba(255,18,80,0.22)   0px,
        rgba(255,18,80,0.22)  20px,
        rgba(0,200,255,0.20)  20px,
        rgba(0,200,255,0.20)  40px,
        rgba(220,255,30,0.18) 40px,
        rgba(220,255,30,0.18) 60px
    )`

    return (
        <div style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            pointerEvents: 'none', zIndex: 22, overflow: 'hidden',
        }}>
            {/* SVG smudge warp */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016"
                            numOctaves="2" seed={7} result="noise"/>
                        <feDisplacementMap in="SourceGraphic" in2="noise"
                            scale="14" xChannelSelector="R" yChannelSelector="G"/>
                    </filter>
                </defs>
            </svg>

            {/* Red-offset layer (drifts slightly ahead) */}
            <div style={{
                position: 'absolute', inset: '-8px 0 0 6px',
                background: `repeating-linear-gradient(
                    45deg,
                    rgba(255,10,70,0.26)   0px,
                    rgba(255,10,70,0.26)  20px,
                    transparent           20px,
                    transparent           60px
                )`,
                backgroundSize: '84px 84px',
                animation: 'chromaR 6s linear infinite',
                filter: `url(#${filterId})`,
                mixBlendMode: 'screen',
            }}/>

            {/* Cyan-offset layer */}
            <div style={{
                position: 'absolute', inset: '0 6px -8px 0',
                background: `repeating-linear-gradient(
                    45deg,
                    transparent           0px,
                    transparent           20px,
                    rgba(0,210,255,0.22)  20px,
                    rgba(0,210,255,0.22)  40px,
                    transparent           40px,
                    transparent           60px
                )`,
                backgroundSize: '84px 84px',
                animation: 'chromaC 6s linear infinite 1s',
                filter: `url(#${filterId})`,
                mixBlendMode: 'screen',
            }}/>

            {/* Yellow/green layer */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `repeating-linear-gradient(
                    45deg,
                    transparent            0px,
                    transparent           40px,
                    rgba(200,255,20,0.18)  40px,
                    rgba(200,255,20,0.18)  60px
                )`,
                backgroundSize: '84px 84px',
                animation: 'chromaY 6s linear infinite 2s',
                mixBlendMode: 'color-dodge',
                opacity: 0.75,
            }}/>

            {/* Combined solid pass — no smudge, crisp pixel edges */}
            <div style={{
                position: 'absolute', inset: 0,
                background: bandR,
                backgroundSize: '84px 84px',
                animation: 'chromaR 6s linear infinite',
                mixBlendMode: 'screen',
                opacity: 0.30,
            }}/>
        </div>
    )
}

// ── Fit Popup Bottom Sheet ─────────────────────────────────────────────────
function FitPopup({ fit, onClose }) {
    const pieces = [
        fit.top       && { label: 'Top',       item: fit.top },
        fit.overlayer && { label: 'Over',       item: fit.overlayer },
        fit.bottom    && { label: 'Bottom',     item: fit.bottom },
        fit.shoes     && { label: 'Shoes',      item: fit.shoes },
        fit.accessory && { label: 'Accessory',  item: fit.accessory },
    ].filter(Boolean)

    return (
        <motion.div className="modal-overlay" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{ width: '100%', maxWidth: 500, background: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '16px 18px 36px', boxShadow: '0 -16px 48px rgba(0,0,0,0.85)' }}>
                <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 14px' }}/>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900, color: '#fff' }}>{fit.name}</div>
                {fit.vibe && <div style={{ fontSize: 12, color: '#777', marginTop: 4, fontStyle: 'italic', marginBottom: 10 }}>{fit.vibe}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {fit.occasion && <span style={{ background: '#1a1a3a', color: '#a688fa', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>📅 {fit.occasion}</span>}
                    {fit.season   && <span style={{ background: '#1a3a1a', color: '#39FF14', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>🌤 {fit.season}</span>}
                    {fit.style    && <span style={{ background: '#3a2a0a', color: '#FFD700', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>✧ {fit.style}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
                    {pieces.map(({ label, item }) => (
                        <div key={item.id} style={{ flex: '0 0 88px', borderRadius: 12, background: '#1a1a1a', border: `2px solid ${CATEGORY_COLORS[item.category] || '#333'}`, overflow: 'hidden', textAlign: 'center' }}>
                            <div style={{ height: 76, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <span style={{ fontSize: 34 }}>{item.emoji}</span>}
                            </div>
                            <div style={{ padding: '4px 5px' }}>
                                <div style={{ fontSize: 8, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                                <div style={{ fontSize: 10, color: '#ddd', fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                <div style={{ fontSize: 9, color: '#FFD700', fontWeight: 700 }}>XP {item.stylePoints}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#555', fontWeight: 700, whiteSpace: 'nowrap' }}>DRIP</span>
                    <div style={{ flex: 1, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(fit.rating / 10) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #32CD32, #FFD700, #FF4500)', borderRadius: 3 }}/>
                    </div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 900, color: '#FFD700' }}>{fit.rating}</span>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── Fit Card Body — 50/50 split with rich info ───────────────────────────────
function FitCardBody({ fit }) {
    const rating     = fit.rating    ?? 8.0
    const worn       = fit.wornCount ?? 0
    const isOnePiece = !!fit.onePiece

    // Left column: dynamic vertical image stack
    const leftPieces = isOnePiece
        ? [
            { item: fit.onePiece, flex: 5,   label: 'One-Piece' },
            fit.shoes && { item: fit.shoes, flex: 1.4, label: 'Shoes' },
          ].filter(Boolean)
        : [
            fit.overlayer && { item: fit.overlayer, flex: 1.5, label: 'Over' },
            fit.top       && { item: fit.top,       flex: 2.6, label: 'Top' },
            fit.bottom    && { item: fit.bottom,    flex: 2.6, label: 'Bottom' },
            fit.shoes     && { item: fit.shoes,     flex: 1.2, label: 'Shoes' },
          ].filter(Boolean)

    const tagList = [
        fit.style     && { label: `✧ ${fit.style}`,     color: '#FFD700' },
        fit.season    && { label: `🌤 ${fit.season}`,    color: '#39FF14' },
        fit.occasion  && { label: `📅 ${fit.occasion}`,  color: '#a688fa' },
        fit.archetype && { label: `🔥 ${fit.archetype}`, color: '#FF4500' },
    ].filter(Boolean)
    const tickerTags   = [...tagList, ...tagList]
    const tickerDur    = `${Math.max(8, tagList.length * 3.5)}s`

    // Build a richer vibe description if none provided
    const vibeText = fit.vibe ||
        `${fit.style || 'Classic'} combo — ${fit.top?.name || 'top'} with ${fit.bottom?.name || 'bottoms'} and ${fit.shoes?.name || 'kicks'}. ${fit.season ? `Great for ${fit.season}.` : ''} Effortlessly put-together.`

    const comboWhy = fit.comboReason ||
        `The ${fit.top?.archetype || fit.style || 'neutral'} top contrasts well with the ${fit.bottom?.archetype || 'bottoms'}, creating a balanced silhouette. ${fit.shoes?.name ? `${fit.shoes.name} ground the look.` : ''}`

    // Piece list for info column
    const pieces = [
        fit.overlayer && { label: 'Over',   item: fit.overlayer },
        fit.top       && { label: 'Top',    item: fit.top },
        fit.bottom    && { label: 'Bottom', item: fit.bottom },
        fit.shoes     && { label: 'Shoes',  item: fit.shoes },
        fit.onePiece  && { label: 'Fit',    item: fit.onePiece },
    ].filter(Boolean)

    const dripPct  = Math.round((rating / 10) * 100)
    const wornPct  = Math.min(Math.round((worn / 100) * 100), 100)

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', margin: '6px 8px 4px', gap: 6 }}>

            {/* ── LEFT 50%: vertically stacked images ── */}
            <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 8, overflow: 'hidden', background: '#111' }}>
                {leftPieces.map(({ item, flex, label }) => (
                    <div key={item.id} style={{ flex, position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                        {item.image
                            ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            : <span style={{ fontSize: 26 }}>{item.emoji}</span>
                        }
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.82))', fontSize: 8, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '10px 4px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#FFD70088', marginRight: 3 }}>{label.toUpperCase()}</span>{item.name}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── RIGHT 50%: info + meters + ticker ── */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>

                {/* ── Info section ── */}
                <div style={{ flex: 1, padding: '5px 5px 0', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', minHeight: 0 }}>

                    {/* Vibe header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, fontStyle: 'italic', color: '#e33', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vibe</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>
                            {fit.occasion || fit.style || 'Everyday'}
                        </span>
                    </div>

                    {/* One-liner description */}
                    <div style={{ fontSize: 10, lineHeight: 1.5, color: '#333', fontStyle: 'italic', borderLeft: '2px solid #FFD70066', paddingLeft: 5 }}>
                        {vibeText}
                    </div>

                    {/* Why this combo works */}
                    <div style={{ fontSize: 9, lineHeight: 1.45, color: '#555' }}>
                        <span style={{ fontWeight: 800, color: '#444' }}>Why it works: </span>
                        {comboWhy}
                    </div>

                    {/* Occasions + Season row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 1 }}>
                        {fit.occasion && <span style={{ fontSize: 8, background: '#210d3a', color: '#a688fa', borderRadius: 20, padding: '2px 7px', fontWeight: 700 }}>📅 {fit.occasion}</span>}
                        {fit.season   && <span style={{ fontSize: 8, background: '#0a2a0a', color: '#39FF14', borderRadius: 20, padding: '2px 7px', fontWeight: 700 }}>🌤 {fit.season}</span>}
                        {fit.style    && <span style={{ fontSize: 8, background: '#2a1a00', color: '#FFD700', borderRadius: 20, padding: '2px 7px', fontWeight: 700 }}>✧ {fit.style}</span>}
                    </div>

                    {/* Piece list */}
                    {pieces.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                            {pieces.map(({ label, item }) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: 12 }}>{item.emoji}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                        <div style={{ fontSize: 8, color: '#888' }}>{label} &middot; {item.archetype || item.category} &middot; <span style={{ color: '#FFD700' }}>XP {item.stylePoints}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Frosted glass meter block ── */}
                <div style={{
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    padding: '8px 9px',
                    display: 'flex', flexDirection: 'column', gap: 7,
                }}>
                    {/* Drip */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 8, fontWeight: 900, color: '#FF4500', letterSpacing: 1.5, textTransform: 'uppercase' }}>⚡ Drip</span>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>{rating}<span style={{ fontSize: 9, color: '#FF4500' }}>/10</span></span>
                        </div>
                        <div style={{ height: 12, background: 'rgba(0,0,0,0.35)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, #32CD32 0%, #FFD700 ${dripPct * 0.6}%, #FF4500 ${dripPct}%, transparent ${dripPct}%)`, borderRadius: 6 }}/>
                            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 10px, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.12) 11px)', borderRadius: 6 }}/>
                        </div>
                    </div>
                    {/* Worn */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 8, fontWeight: 900, color: '#00BFFF', letterSpacing: 1.5, textTransform: 'uppercase' }}>👕 Worn</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#aaa', lineHeight: 1 }}>{worn}<span style={{ fontSize: 8, color: '#555' }}>×</span></span>
                        </div>
                        <div style={{ height: 12, background: 'rgba(0,0,0,0.35)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, #00BFFF 0%, #a688fa ${wornPct}%, transparent ${wornPct}%)`, borderRadius: 6 }}/>
                            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 10px, rgba(0,0,0,0.12) 10px, rgba(0,0,0,0.12) 11px)', borderRadius: 6 }}/>
                        </div>
                    </div>
                </div>

                {/* ── Tag ticker ── */}
                {tickerTags.length > 0 && (
                    <div style={{ flexShrink: 0, height: 26, overflow: 'hidden', background: '#0e0e0e', borderRadius: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', animation: `tagTicker ${tickerDur} linear infinite`, willChange: 'transform', paddingLeft: 8 }}>
                            {tickerTags.map((t, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 9, fontWeight: 700, color: t.color, border: `1px solid ${t.color}55`, borderRadius: 20, padding: '2px 8px', background: `${t.color}1a`, flexShrink: 0 }}>
                                    {t.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PokemonCard COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function PokemonCard({ item, onClose, isFavorite, onToggleFav, FITS }) {
    const [name, setName]         = useState(item.name)
    const [fitPopup, setFitPopup] = useState(null)

    // Tilt physics state
    const [tiltX, setTiltX]   = useState(0)   // deg
    const [tiltY, setTiltY]   = useState(0)
    const [mx, setMx]         = useState(0.5) // 0–1 normalised
    const [my, setMy]         = useState(0.5)
    const [hovering, setHov]  = useState(false)
    const cardRef = useRef(null)
    const rafRef  = useRef(null)
    const targetTilt = useRef({ x: 0, y: 0 })

    const isFit       = !!item._isFit
    const typeConfig  = TYPE_MAPPING[item.archetype || item.style] || TYPE_MAPPING['Minimalist']
    const borderColor = CATEGORY_COLORS[item.category] || '#888'
    const conditionInfo = getCondition(item.wornCount ?? 0)
    const xp = item.stylePoints || Math.round((item.rating || 8) * 10)
    const worn = item.wornCount ?? 0

    let statusText = 'REGULAR'
    if (item.shiny)                          statusText = '✦ SHINY'
    else if (item.favorite || worn <= 10)    statusText = '◈ RARE'
    else if (worn > 50)                      statusText = '⚔ VETERAN'

    /* ── Smooth spring tilt with requestAnimationFrame ─────────────────── */
    const lerp = (a, b, t) => a + (b - a) * t

    useEffect(() => {
        let curX = 0, curY = 0
        let running = true
        const tick = () => {
            if (!running) return
            curX = lerp(curX, targetTilt.current.x, 0.12)
            curY = lerp(curY, targetTilt.current.y, 0.12)
            setTiltX(curX)
            setTiltY(curY)
            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        return () => { running = false; cancelAnimationFrame(rafRef.current) }
    }, [])

    const onMouseMove = useCallback((e) => {
        if (!cardRef.current) return
        const r  = cardRef.current.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width
        const ny = (e.clientY - r.top)  / r.height
        targetTilt.current = { x: (ny - 0.5) * -22, y: (nx - 0.5) * 22 }
        setMx(nx)
        setMy(ny)
        setHov(true)
    }, [])

    const onMouseLeave = useCallback(() => {
        targetTilt.current = { x: 0, y: 0 }
        setHov(false)
    }, [])

    // (image parallax removed — whole card tilts instead)
    const availableFits = (FITS || []).slice(0, 3)


    /* ── Full card view ──────────────────────────────────────────────────── */
    return (
        <>
            <div className="modal-overlay" onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <motion.div
                    ref={cardRef}
                    onMouseMove={onMouseMove}
                    onMouseLeave={onMouseLeave}
                    initial={{ opacity: 0, scale: 0.7, rotateY: -25, y: 60 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, rotateY: 25, y: 40 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%', maxWidth: 360,
                        height: isFit ? 600 : 580,
                        borderRadius: 18,
                        background: borderColor,
                        padding: 10,
                        boxShadow: `0 32px 70px -8px rgba(0,0,0,0.95), 0 0 0 2px rgba(255,255,255,0.08), 0 0 50px ${borderColor}44`,
                        cursor: 'grab',
                        transformStyle: 'preserve-3d',
                        willChange: 'transform',
                        transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                        transition: hovering ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
                        filter: wearFilter(worn),
                    }}
                >
                    {/* ── Inner Card Frame ── */}
                    <div style={{
                        position: 'absolute', inset: 10, borderRadius: 10,
                        background: typeConfig.bg,
                        border: `5px solid ${borderColor}`,
                        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.28), inset 0 0 60px rgba(255,255,255,0.14)',
                        overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        transformStyle: 'preserve-3d',
                    }}>

                        {/* ── HEADER ── */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '7px 12px',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,0.92))',
                            borderBottom: '2px solid rgba(255,255,255,0.09)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1, color: item.shiny ? '#FFD700' : '#999', whiteSpace: 'nowrap' }}>
                                    {isFit ? '🏆 TRAINER' : statusText}
                                </span>
                                <input value={name} onChange={e => setName(e.target.value)}
                                    style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 900, color: '#fff', outline: 'none', border: 'none', background: 'transparent', width: 148, margin: 0, padding: 0, textShadow: '1px 1px 4px rgba(0,0,0,0.9)' }}/>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#ffb700', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                                <span style={{ fontSize: 9, fontWeight: 800 }}>XP</span>
                                <span style={{ fontSize: 21, fontWeight: 900 }}>{xp}</span>
                                <span style={{ fontSize: 17 }}>{typeConfig.icon}</span>
                            </div>
                        </div>

                        {/* ── BODY: Apparel or Fit ── */}
                        {isFit ? (
                            <FitCardBody fit={item} onFitClick={setFitPopup}/>
                        ) : (
                            <>
                                {/* IMAGE WINDOW — static relative to card (no parallax) */}
                                <div style={{
                                    margin: '8px 10px 0', height: 180,
                                    border: '3px solid rgba(0,0,0,0.3)', borderRadius: 4,
                                    background: typeConfig.bg,
                                    position: 'relative', overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {item.image
                                        ? <img src={item.image} alt={item.name} style={{ width: '82%', height: '82%', objectFit: 'contain', filter: 'drop-shadow(3px 3px 0 #fff) drop-shadow(-2px -2px 0 #fff) drop-shadow(4px 4px 0 #000)' }}/>
                                        : <span style={{ fontSize: 80, filter: 'drop-shadow(3px 3px 0 rgba(255,255,255,0.9)) drop-shadow(5px 5px 0 #000)' }}>{item.emoji}</span>
                                    }
                                    {/* Wear overlay inside image window (image-surface damage) */}
                                    <WearOverlay wornCount={worn}/>
                                </div>

                                {/* STATS BAR */}
                                <div style={{ background: 'rgba(0,0,0,0.55)', padding: '3px 12px', margin: '4px 10px 0', display: 'flex', justifyContent: 'space-between', gap: 4, fontSize: 9, fontWeight: 700, fontStyle: 'italic', color: '#ccc', borderRadius: 4 }}>
                                    <span>NO.{item.id}</span>
                                    <span>{item.archetype}</span>
                                    {item.brand && <span>{item.brand}</span>}
                                    {item.size  && <span>{item.size}</span>}
                                    <span style={{ color: conditionInfo.class === 'mint' ? '#39FF14' : conditionInfo.class === 'beat' ? '#FF4444' : '#FFD700' }}>{conditionInfo.label}</span>
                                </div>

                                {/* TAG PILLS */}
                                {item.tags?.length > 0 && (
                                    <div style={{ padding: '4px 12px 0', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {item.tags.slice(0, 5).map(tag => (
                                            <span key={tag} style={{ fontSize: 8, fontWeight: 700, borderRadius: 20, padding: '2px 6px', background: tagColor(tag) + '22', color: tagColor(tag), border: `1px solid ${tagColor(tag)}55` }}>{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* INFO */}
                                <div style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    <div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                                            <span style={{ color: '#e33', fontSize: 11, fontWeight: 900, fontStyle: 'italic' }}>Ability</span>
                                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 800, color: '#111' }}>Drip Echo</span>
                                        </div>
                                        <div style={{ fontSize: 10, lineHeight: 1.45, color: '#222' }}>
                                            {item.description || 'A staple wardrobe item that guarantees solid style points.'}
                                        </div>
                                    </div>
                                    {item.conditionDetails && (
                                        <div style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 6, padding: '5px 8px' }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Condition: </span>
                                            <span style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>{item.conditionDetails}</span>
                                        </div>
                                    )}
                                    {(item.pairsWith || item.clashesWith) && (
                                        <>
                                            <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.12)', margin: 0 }}/>
                                            {item.pairsWith && (
                                                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: 13 }}>✅</span>
                                                    <div>
                                                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 800, color: '#1a7a1a' }}>Pairs Well</div>
                                                        <div style={{ fontSize: 10, fontStyle: 'italic', color: '#444' }}>{item.pairsWith}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {item.clashesWith && (
                                                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: 13 }}>❌</span>
                                                    <div>
                                                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 800, color: '#c00' }}>Clashes</div>
                                                        <div style={{ fontSize: 10, fontStyle: 'italic', color: '#444' }}>{item.clashesWith}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── BOTTOM BAR ── */}
                        <div style={{ padding: '7px 12px', background: 'rgba(0,0,0,0.85)', borderTop: '2px solid rgba(255,255,255,0.07)', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>
                                    <span>Wear</span><span>{Math.min(worn, 100)}/100</span>
                                </div>
                                <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min((worn / 100) * 100, 100)}%`, height: '100%', background: worn > 75 ? '#FF4500' : worn > 50 ? 'linear-gradient(90deg, #FFD700, #FF4500)' : 'linear-gradient(90deg, #32CD32, #FFD700)', borderRadius: 3, transition: 'width 0.5s ease' }}/>
                                </div>
                            </div>
                            {!isFit && availableFits.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: 8, fontWeight: 700, color: '#FFD700', textTransform: 'uppercase' }}>Fits</span>
                                    {availableFits.map(fit => (
                                        <motion.div key={fit.id} whileHover={{ scale: 1.3, y: -3 }} whileTap={{ scale: 0.88 }}
                                            onClick={(e) => { e.stopPropagation(); setFitPopup(fit) }}
                                            style={{ width: 30, height: 30, borderRadius: 8, background: '#1a1a1a', border: '2px solid #FF006E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                                            title={fit.name}>
                                            {fit.top?.emoji || '🔥'}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div style={{ padding: '2px 12px 6px', fontSize: 7, color: 'rgba(255,255,255,0.22)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Illus. WrDrB Generative</span>
                            <span>© 2026 WrDrB / Vault</span>
                        </div>

                        {/* Wear marks OVER the inner card surface */}
                        <WearOverlay wornCount={worn}/>
                    </div>

                    {/* ── HOLO SHINE OVERLAY (shiny cards only) ── */}
                    <HoloShine isShiny={!!item.shiny} hovering={hovering} mx={mx} my={my}/>

                    {/* ── Favourite Button ── */}
                    <motion.button whileTap={{ scale: 0.82 }}
                        onClick={(e) => { e.stopPropagation(); onToggleFav() }}
                        style={{
                            position: 'absolute', top: -12, right: -12, zIndex: 30,
                            width: 46, height: 46, borderRadius: '50%',
                            background: isFavorite ? '#FF006E' : '#1a1a1a',
                            border: `3px solid ${borderColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: `0 4px 16px rgba(0,0,0,0.65), 0 0 12px ${isFavorite ? '#FF006E55' : 'transparent'}`,
                            transition: 'background 0.25s, box-shadow 0.25s'
                        }}>
                        <Heart size={20} fill={isFavorite ? '#fff' : 'none'} color={isFavorite ? '#fff' : '#666'}/>
                    </motion.button>

                    {/* ── Close / Minimize Button ── */}
                    <motion.button whileTap={{ scale: 0.82 }}
                        onClick={(e) => { e.stopPropagation(); onClose() }}
                        style={{
                            position: 'absolute', top: -12, left: -12, zIndex: 30,
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.75)',
                            border: `2px solid rgba(255,255,255,0.2)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                            transition: 'background 0.2s'
                        }}>
                        <Minimize2 size={14} color="#aaa"/>
                    </motion.button>
                </motion.div>
            </div>

            {/* Fit popup */}
            <AnimatePresence>
                {fitPopup && <FitPopup fit={fitPopup} onClose={() => setFitPopup(null)}/>}
            </AnimatePresence>
        </>
    )
}
