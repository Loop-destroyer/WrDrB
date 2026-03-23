/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DripRoulette.jsx — Drip Tab (Tab 1) Homepage
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The main roulette page for WrDrB. Users spin to get randomized outfit
 * suggestions from their wardrobe vault. Supports three layout modes:
 *
 *   • STANDARD  — Top (1fr) · Bottom (1fr) · Shoes (0.45fr compact)
 *   • OVERLAYER — [Overlayer | Top] side-by-side · Bottom · Shoes
 *   • ONE-PIECE — One-Piece tall tile (1fr) · Shoes (0.35fr compact)
 *
 * Key features:
 *   - Prompt engine — keyword-based outfit suggestion + explanation
 *   - Expandable explanation panel — shows why each piece was chosen
 *   - Mobile keyboard support — visualViewport resize detection
 *   - Scroll-direction prompt bar (↓ show, ↑ hide)
 *   - Auto one-piece detection (30% chance, female users only)
 *   - Responsive clamp() sizing for all screen ratios
 *   - Stagger mount animations on reel tiles
 *   - Artistic frame with corner ornaments
 *
 * Dependencies: react, framer-motion, lucide-react, mockData, promptEngine
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dices, Camera, ArrowRight, Layers, Plus, Heart, ChevronDown, Sparkles, Palette, Shirt } from 'lucide-react'
import { TOPS, BOTTOMS, SHOES, OVERLAYERS, ONE_PIECES, USER_PROFILE } from '../data/mockData'
import AddApparelModal from '../components/AddApparelModal'
import { processPrompt } from '../utils/promptEngine'

// ── Animation presets (shared spring configs) ───────────────────────────────
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 28 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 26 }
const SPRING_BOUNCY = { type: 'spring', stiffness: 260, damping: 24 }
const SPRING_LAYOUT = { type: 'spring', stiffness: 300, damping: 30 }

// ── Accent colors per reel category ─────────────────────────────────────────
const ACCENT = {
    top: 'var(--cyber-yellow)',  // #FFD700
    bottom: '#00F5FF',              // Cyan
    shoes: 'var(--electric-purple)', // #8A2BE2
    overlayer: '#FF006E',              // Hot pink
    onepiece: '#FF006E',              // Hot pink
}

// ── Responsive value helpers (avoid re-creating strings) ────────────────────
const R = {
    fabSmall: 'clamp(30px, 7vw, 40px)',
    fabMed: 'clamp(34px, 8vw, 44px)',
    fabLg: 'clamp(38px, 9vw, 48px)',
    fabXl: 'clamp(40px, 9vw, 50px)',
    promptBtn: 'clamp(28px, 7vw, 36px)',
    promptSend: 'clamp(24px, 6vw, 30px)',
    offset: 'clamp(10px, 2vw, 16px)',
    offsetSm: 'clamp(6px, 1.5vw, 12px)',
    offsetXs: 'clamp(8px, 2vw, 14px)',
    gap: 'clamp(3px, 1vw, 6px)',
    pad: 'clamp(4px, 1.5vw, 10px)',
    fabGap: 'clamp(6px, 1.5vw, 10px)',
    // Tile-specific
    radiusStd: 'clamp(14px, 3vw, 18px)',
    radiusComp: 'clamp(10px, 2.5vw, 14px)',
    badgePos: 'clamp(6px, 1.5vw, 10px)',
    badgePosC: 'clamp(4px, 1vw, 6px)',
    fontStd: 'clamp(11px, 2.5vw, 14px)',
    fontComp: 'clamp(9px, 2vw, 12px)',
    fontBadge: 'clamp(8px, 1.8vw, 11px)',
    fontBadgeC: 'clamp(7px, 1.5vw, 9px)',
    emojiStd: 'clamp(48px, 12vw, 80px)',
    emojiComp: 'clamp(32px, 8vw, 48px)',
    heartStd: 'clamp(26px, 6vw, 32px)',
    heartComp: 'clamp(20px, 5vw, 26px)',
}

// ── Corner ornament SVG paths ───────────────────────────────────────────────
const CORNER_PATHS = [
    'M2 14V4a2 2 0 012-2h10',
    'M14 14V4a2 2 0 00-2-2H2',
    'M2 2v10a2 2 0 002 2h10',
    'M14 2v10a2 2 0 01-2 2H2',
]
const CORNER_POSITIONS = [
    { top: 0, left: 6 },
    { top: 0, right: 6 },
    { bottom: 0, left: 6 },
    { bottom: 0, right: 6 },
]

// ── Gradient overlays (standard vs compact) ─────────────────────────────────
const GRADIENT_STANDARD = 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 60%, rgba(0,0,0,0.65) 85%, rgba(0,0,0,0.85) 100%)'
const GRADIENT_COMPACT = 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.8) 100%)'


/* ═══════════════════════════════════════════════════════════════════════════
   Hook: useScrollDirection
   ═══════════════════════════════════════════════════════════════════════════ */
function useScrollDirection(ref) {
    const [dir, setDir] = useState(null)
    const touchY = useRef(0)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const onWheel = (e) => {
            if (Math.abs(e.deltaY) < 4) return
            setDir(e.deltaY > 0 ? 'down' : 'up')
        }
        const onTouchStart = (e) => {
            touchY.current = e.touches[0].clientY
        }
        const onTouchMove = (e) => {
            const delta = touchY.current - e.touches[0].clientY
            if (Math.abs(delta) < 8) return
            setDir(delta > 0 ? 'down' : 'up')
            touchY.current = e.touches[0].clientY
        }

        el.addEventListener('wheel', onWheel, { passive: true })
        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: true })
        return () => {
            el.removeEventListener('wheel', onWheel)
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
        }
    }, [ref])

    const reset = useCallback(() => setDir(null), [])
    return [dir, reset]
}


/* ═══════════════════════════════════════════════════════════════════════════
   Hook: useKeyboardHeight
   ═══════════════════════════════════════════════════════════════════════════
   Detects mobile keyboard open/close via visualViewport API.
   Returns the keyboard height in pixels (0 when closed).
   ═══════════════════════════════════════════════════════════════════════════ */
function useKeyboardHeight() {
    const [kbHeight, setKbHeight] = useState(0)

    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return

        const onResize = () => {
            const diff = window.innerHeight - vv.height
            setKbHeight(diff > 50 ? diff : 0)
        }

        vv.addEventListener('resize', onResize)
        vv.addEventListener('scroll', onResize)
        return () => {
            vv.removeEventListener('resize', onResize)
            vv.removeEventListener('scroll', onResize)
        }
    }, [])

    return kbHeight
}


/* ═══════════════════════════════════════════════════════════════════════════
   Component: ReelTile
   ═══════════════════════════════════════════════════════════════════════════ */
function ReelTile({ items, spinning, onSpinEnd, delay = 0, accentColor = ACCENT.top, compact = false, index = 0 }) {
    const containerRef = useRef(null)
    const stripRef = useRef(null)
    const rafRef = useRef(null)
    const startRef = useRef(null)

    const [currentItem, setCurrentItem] = useState(items[0])
    const [settled, setSettled] = useState(false)
    const [fav, setFav] = useState(items[0]?.favorite ?? false)
    const [imgFailed, setImgFailed] = useState(false)

    const strip = useMemo(() => {
        const copies = []
        for (let i = 0; i < 6; i++) copies.push(...items)
        return copies
    }, [items])

    useEffect(() => {
        if (!spinning) return
        setSettled(false)
        setImgFailed(false)

        const n = items.length
        const h = containerRef.current?.offsetHeight || 200
        const randomIdx = Math.floor(Math.random() * n)
        const duration = 1600 + delay
        startRef.current = null

        const animate = (ts) => {
            if (!startRef.current) startRef.current = ts
            const elapsed = ts - startRef.current
            const t = Math.min(elapsed / duration, 1)
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            const totalScroll = n * h * 5 + randomIdx * h
            const offset = (totalScroll * eased) % (n * h)

            if (stripRef.current) {
                stripRef.current.style.transform = `translateY(-${offset}px)`
                stripRef.current.style.filter = t < 0.85 ? `blur(${Math.min((1 - t) * 6, 4)}px)` : 'none'
            }

            if (t < 1) {
                rafRef.current = requestAnimationFrame(animate)
            } else {
                if (stripRef.current) {
                    stripRef.current.style.transform = `translateY(-${randomIdx * h}px)`
                    stripRef.current.style.filter = 'none'
                }
                const picked = items[randomIdx]
                setCurrentItem(picked)
                setFav(picked.favorite ?? false)
                setSettled(true)
                onSpinEnd(picked)
            }
        }

        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
    }, [spinning, delay])

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING_BOUNCY, delay: index * 0.06 }}
            style={{
                width: '100%', height: '100%',
                borderRadius: compact ? R.radiusComp : R.radiusStd,
                overflow: 'hidden', position: 'relative',
                border: `2px solid ${settled && !spinning ? accentColor : '#1c1c1c'}`,
                boxShadow: settled && !spinning ? `0 0 24px ${accentColor}44` : 'none',
                transition: 'border-color 0.45s ease, box-shadow 0.45s ease',
                background: '#0e0e0e',
            }}
        >
            <div ref={stripRef} style={{ willChange: 'transform', position: 'absolute', inset: 0, width: '100%' }}>
                {strip.map((item, i) => (
                    <div key={i} style={{ width: '100%', height: '100%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        {item.image && !imgFailed ? (
                            <img src={item.image} alt={item.name} loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                                onError={() => setImgFailed(true)} />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)', fontSize: compact ? R.emojiComp : R.emojiStd
                            }}>
                                {item.emoji}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
                background: compact ? GRADIENT_COMPACT : GRADIENT_STANDARD
            }} />

            <AnimatePresence>
                {spinning && !compact && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute', top: R.badgePosC, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
                            background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 20, padding: '3px 10px'
                        }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: R.fontBadgeC, fontWeight: 800, color: 'var(--cyber-yellow)', letterSpacing: '1.5px' }}>ROLLING</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{
                position: 'absolute', top: compact ? R.badgePosC : R.badgePos, left: compact ? R.badgePosC : R.badgePos, zIndex: 6,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20,
                padding: compact ? '2px 6px' : '3px 8px', display: 'flex', alignItems: 'center', gap: 3
            }}>
                <span style={{ fontSize: compact ? R.fontBadgeC : R.fontBadge }}>⭐</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: compact ? R.fontBadgeC : R.fontBadge, fontWeight: 800, color: 'var(--cyber-yellow)' }}>
                    {currentItem.stylePoints} XP
                </span>
            </div>

            <div style={{ position: 'absolute', bottom: compact ? R.badgePosC : R.badgePos, left: 8, right: 8, zIndex: 6, textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: compact ? R.fontComp : R.fontStd, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                    {currentItem.name}
                </span>
            </div>

            <motion.button whileTap={{ scale: 1.3 }} onClick={() => setFav(f => !f)}
                style={{
                    position: 'absolute', top: compact ? R.badgePosC : R.badgePos, right: compact ? R.badgePosC : R.badgePos, zIndex: 6,
                    width: compact ? R.heartComp : R.heartStd, height: compact ? R.heartComp : R.heartStd, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
                    border: `1px solid ${fav ? 'rgba(255,0,110,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.2s'
                }}>
                <Heart size={compact ? 10 : 13} fill={fav ? '#FF006E' : 'none'} color={fav ? '#FF006E' : 'rgba(255,255,255,0.7)'} />
            </motion.button>
        </motion.div>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Component: ArtisticFrame
   ═══════════════════════════════════════════════════════════════════════════ */
function ArtisticFrame() {
    return (
        <>
            <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(255,215,0,0.06)', borderRadius: 24, pointerEvents: 'none', zIndex: 0 }} />
            {CORNER_POSITIONS.map((pos, i) => (
                <div key={i} style={{ position: 'absolute', ...pos, zIndex: 1, width: 16, height: 16, pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d={CORNER_PATHS[i]} stroke="rgba(255,215,0,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            ))}
        </>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Component: SpinToast
   ═══════════════════════════════════════════════════════════════════════════ */
function SpinToast({ visible, spinCount, isOnePiece, isPrompted }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0, scale: 0.9 }}
                    transition={SPRING_SNAPPY}
                    style={{ position: 'absolute', top: R.offsetSm, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(15,15,15,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,215,0,0.2)',
                        borderRadius: 50, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                        <span style={{ fontSize: 14 }}>{isPrompted ? '🎯' : '🎰'}</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 800, color: 'var(--cyber-yellow)', letterSpacing: '0.5px' }}>
                            {isPrompted ? 'AI Styled' : `Spin #${spinCount}`}
                        </span>
                        {isOnePiece && <span style={{ fontSize: 9, color: '#FF006E', fontWeight: 700 }}>👗</span>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Component: ExplanationPanel
   ═══════════════════════════════════════════════════════════════════════════
   Expandable card that slides below the reel grid showing why each
   piece was chosen. Only appears after a prompted spin.
   ═══════════════════════════════════════════════════════════════════════════ */
function ExplanationPanel({ explanation, visible, onClose }) {
    if (!explanation || !visible) return null

    const entries = [
        explanation.top && { key: 'top', label: 'Top', icon: <Shirt size={14} />, ...explanation.top },
        explanation.bottom && { key: 'bottom', label: 'Bottom', icon: <Shirt size={14} />, ...explanation.bottom },
        explanation.shoes && { key: 'shoes', label: 'Shoes', icon: <Shirt size={14} />, ...explanation.shoes },
        explanation.overlayer && { key: 'overlayer', label: 'Layer', icon: <Layers size={14} />, ...explanation.overlayer },
    ].filter(Boolean)

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_SMOOTH}
                    style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                    <div style={{
                        margin: `0 ${R.pad}`,
                        background: 'rgba(15,15,15,0.92)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,215,0,0.12)',
                        borderRadius: 16,
                        padding: 'clamp(10px, 2.5vw, 16px)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={14} color="var(--cyber-yellow)" />
                                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 800, color: 'var(--cyber-yellow)', letterSpacing: '0.5px' }}>
                                    WHY THIS FIT WORKS
                                </span>
                            </div>
                            <motion.button whileTap={{ scale: 0.8 }} onClick={onClose}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                <ChevronDown size={16} color="#666" />
                            </motion.button>
                        </div>

                        {/* Summary */}
                        {explanation.summary && (
                            <div style={{
                                fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic',
                                marginBottom: 12, paddingBottom: 10,
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                {explanation.summary}
                            </div>
                        )}

                        {/* Item explanations */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {entries.map(entry => (
                                <div key={entry.key} style={{ display: 'flex', gap: 10 }}>
                                    {/* Item icon */}
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                        background: `${ACCENT[entry.key] || 'var(--cyber-yellow)'}15`,
                                        border: `1px solid ${ACCENT[entry.key] || 'var(--cyber-yellow)'}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: ACCENT[entry.key] || 'var(--cyber-yellow)',
                                    }}>
                                        {entry.icon}
                                    </div>
                                    {/* Explanation text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700,
                                            color: 'white', marginBottom: 2,
                                        }}>
                                            {entry.item?.name || entry.label}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                            {entry.reason}
                                        </div>
                                        {entry.colorNote && (
                                            <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.6)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Palette size={9} />
                                                {entry.colorNote}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Component: FloatingPromptBar
   ═══════════════════════════════════════════════════════════════════════════
   Context-aware prompt input. Mobile-optimized with:
     - inputMode="text" + enterKeyHint="send" for proper keyboard
     - Auto-focus on appear
     - Enter key triggers spin
     - Positions above mobile keyboard via kbHeight offset
   ═══════════════════════════════════════════════════════════════════════════ */
function FloatingPromptBar({ visible, prompt, onPromptChange, spinning, onSpin, kbHeight, inputRef, onFocus, onBlur }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    style={{
                        position: 'absolute',
                        bottom: kbHeight > 0 ? kbHeight + 8 : R.offsetXs,
                        left: R.offsetXs, right: 'clamp(64px, 14vw, 78px)',
                        zIndex: 18,
                        transition: 'bottom 0.2s ease',
                    }}
                >
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: R.gap,
                        background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 50, padding: R.badgePosC,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    }}>
                        {/* Dice / Surprise Me button */}
                        <motion.button
                            whileTap={{ scale: 0.8, rotate: 180 }}
                            onClick={onSpin}
                            style={{
                                width: R.promptBtn, height: R.promptBtn,
                                borderRadius: '50%', flexShrink: 0,
                                background: spinning ? 'var(--cyber-yellow)' : 'rgba(255,215,0,0.12)',
                                border: `1px solid ${spinning ? 'var(--cyber-yellow)' : 'rgba(255,215,0,0.3)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'background 0.3s',
                            }}
                        >
                            <Dices size={15} color={spinning ? 'black' : 'var(--cyber-yellow)'} />
                        </motion.button>

                        {/* Prompt text input — mobile optimized */}
                        <input
                            ref={inputRef}
                            value={prompt}
                            onChange={onPromptChange}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSpin() } }}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            placeholder="Going to a rainy coffee date..."
                            inputMode="text"
                            enterKeyHint="send"
                            autoComplete="off"
                            autoCorrect="off"
                            style={{
                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                color: 'white', fontFamily: 'var(--font-body)',
                                fontSize: 'clamp(11px, 2.5vw, 13px)', minWidth: 0,
                            }}
                        />

                        {/* Send / Submit button */}
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={onSpin}
                            style={{
                                width: R.promptSend, height: R.promptSend,
                                borderRadius: '50%', flexShrink: 0,
                                background: prompt.trim() ? 'var(--electric-purple)' : 'rgba(138,43,226,0.3)',
                                border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'background 0.2s',
                            }}
                        >
                            <ArrowRight size={12} color="white" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Page Component: DripRoulette (default export)
   ═══════════════════════════════════════════════════════════════════════════
   Main page orchestrator. Manages:
     - Spin lifecycle (trigger → process prompt → animate → settle → toast)
     - Layout mode switching (standard / overlayer / onepiece)
     - Prompt engine integration (filtered pools + explanation)
     - Scroll-direction prompt bar visibility
     - Mobile keyboard avoidance
     - Dynamic CSS Grid template computation
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DripRoulette() {
    // ── State ────────────────────────────────────────────────────────────
    const [spinning, setSpinning] = useState(false)
    const [spinCount, setSpinCount] = useState(0)
    const [showOverlayer, setShowOverlayer] = useState(false)
    const [onePieceMode, setOnePieceMode] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [results, setResults] = useState({ top: TOPS[0], bottom: BOTTOMS[0], shoes: SHOES[0] })
    const [showPrompt, setShowPrompt] = useState(false)
    const [showToast, setShowToast] = useState(false)

    // ── Prompt engine state ──────────────────────────────────────────────
    const [activePools, setActivePools] = useState(null)
    const [explanation, setExplanation] = useState(null)
    const [showExplanation, setShowExplanation] = useState(false)
    const [lastPromptWasAI, setLastPromptWasAI] = useState(false)

    // ── Refs ─────────────────────────────────────────────────────────────
    const spinsDoneRef = useRef(0)
    const toastTimerRef = useRef(null)
    const pageRef = useRef(null)
    const promptTimerRef = useRef(null)
    const promptInputRef = useRef(null)
    const promptFocusRef = useRef(false)   // tracks if input is actively focused

    // ── Derived ──────────────────────────────────────────────────────────
    const isFemale = USER_PROFILE.gender === 'female'

    // ── Mobile keyboard height ───────────────────────────────────────────
    const kbHeight = useKeyboardHeight()

    // ── Active item pools (engine-filtered or defaults) ──────────────────
    const pools = useMemo(() => ({
        tops: activePools?.tops || TOPS,
        bottoms: activePools?.bottoms || BOTTOMS,
        shoes: activePools?.shoes || SHOES,
        overlayers: activePools?.overlayers || OVERLAYERS,
    }), [activePools])

    /* ── Scroll-direction → prompt & explanation visibility ────────────── */
    const [scrollDir, resetScrollDir] = useScrollDirection(pageRef)

    useEffect(() => {
        if (!scrollDir) return

        if (scrollDir === 'down') {
            setShowPrompt(true)
            clearTimeout(promptTimerRef.current)
            // Only auto-hide if NOT actively typing
            if (!promptFocusRef.current) {
                promptTimerRef.current = setTimeout(() => {
                    if (!promptFocusRef.current) setShowPrompt(false)
                }, 5000)
            }
            // Show explanation on scroll down if available
            if (explanation && lastPromptWasAI) {
                setShowExplanation(true)
            }
        } else {
            // Only hide prompt if not focused (typing)
            if (!promptFocusRef.current) {
                setShowPrompt(false)
                clearTimeout(promptTimerRef.current)
            }
            // Always hide explanation on scroll up
            setShowExplanation(false)
        }

        const t = setTimeout(resetScrollDir, 200)
        return () => clearTimeout(t)
    }, [scrollDir, resetScrollDir, explanation, lastPromptWasAI])

    /* ── handleSpin — triggers the roulette with optional prompt ──────── */
    const handleSpin = useCallback(() => {
        if (spinning) return
        spinsDoneRef.current = 0

        // Process prompt through the engine
        const trimmedPrompt = prompt.trim()
        const result = processPrompt(trimmedPrompt, {
            tops: TOPS, bottoms: BOTTOMS, shoes: SHOES, overlayers: OVERLAYERS,
        }, { includeOverlayer: showOverlayer })

        if (result.prompted) {
            setActivePools(result.pools)
            setExplanation(result.explanation)
            setLastPromptWasAI(true)

            // Auto-enable overlayer if engine suggests it
            if (result.shouldOverlayer && !showOverlayer) {
                setShowOverlayer(true)
            }
        } else {
            setActivePools(null)
            setExplanation(null)
            setLastPromptWasAI(false)
        }

        // Auto one-piece: 30% chance for female users (only on random spins)
        const willOnePiece = !result.prompted && isFemale && Math.random() < 0.3
        setOnePieceMode(willOnePiece)
        if (willOnePiece) setShowOverlayer(false)

        // Hide explanation during spin (will show after)
        setShowExplanation(false)

        setSpinning(true)
        setSpinCount(c => c + 1)

        // Dismiss keyboard and prompt bar on spin
        promptInputRef.current?.blur()
    }, [spinning, prompt, isFemale, showOverlayer])

    /* ── handleReelDone — called when a single reel settles ─────────── */
    const handleReelDone = useCallback((key, item) => {
        spinsDoneRef.current += 1
        setResults(prev => ({ ...prev, [key]: item }))

        const expected = onePieceMode ? 2 : (showOverlayer ? 4 : 3)
        if (spinsDoneRef.current >= expected) {
            setTimeout(() => setSpinning(false), 150)
            clearTimeout(toastTimerRef.current)
            setShowToast(true)
            toastTimerRef.current = setTimeout(() => setShowToast(false), 2500)
            // Explanation is NOT auto-shown here — user scrolls down to see it
        }
    }, [onePieceMode, showOverlayer])

    /* ── toggleOverlayer ────────────────────────────────────────────── */
    const toggleOverlayer = useCallback(() => {
        setShowOverlayer(o => !o)
    }, [])

    /* ── Dynamic grid template (memoized) ──────────────────────────── */
    const { gridRows, gridCols } = useMemo(() => {
        if (onePieceMode) return { gridRows: '1fr 0.35fr', gridCols: '1fr' }
        if (showOverlayer) return { gridRows: '1fr 1fr 0.4fr', gridCols: '1fr 1fr' }
        return { gridRows: '1fr 1fr 0.45fr', gridCols: '1fr' }
    }, [onePieceMode, showOverlayer])

    // ═════════════════════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════════════════════
    return (
        <div
            ref={pageRef}
            className="page-wrapper"
            style={{
                background: 'var(--deep-black)', height: '100%',
                display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {/* ─── [FAB] Overlayer toggle (top-left) ───────────────────── */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={toggleOverlayer}
                style={{
                    position: 'absolute', top: R.offsetSm, left: R.offsetSm, zIndex: 20,
                    width: R.fabSmall, height: R.fabSmall,
                    borderRadius: '50%', cursor: 'pointer',
                    background: showOverlayer ? 'rgba(138,43,226,0.25)' : 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${showOverlayer ? 'rgba(138,43,226,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: showOverlayer ? '0 4px 16px rgba(138,43,226,0.3)' : 'none',
                    transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
                }}
            >
                <Layers size={15} color={showOverlayer ? 'var(--electric-purple)' : '#777'} />
            </motion.button>

            {/* ─── Spin toast notification ──────────────────────────────── */}
            <SpinToast visible={showToast} spinCount={spinCount} isOnePiece={onePieceMode} isPrompted={lastPromptWasAI} />

            {/* ─── Dynamic reel grid ───────────────────────────────────── */}
            <motion.div
                layout
                transition={SPRING_LAYOUT}
                style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateRows: gridRows,
                    gridTemplateColumns: gridCols,
                    gap: R.gap,
                    padding: `${R.pad} ${R.pad}`,
                    minHeight: 0, overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <ArtisticFrame />

                {/* ── Layout: One-Piece Mode ───────────────────────────── */}
                {onePieceMode && (
                    <>
                        <ReelTile key={`op-${spinCount}`} items={ONE_PIECES} spinning={spinning}
                            onSpinEnd={item => handleReelDone('onepiece', item)} delay={0}
                            accentColor={ACCENT.onepiece} index={0} />
                        <ReelTile key={`shoes-op-${spinCount}`} items={pools.shoes} spinning={spinning}
                            onSpinEnd={item => handleReelDone('shoes', item)} delay={400}
                            accentColor={ACCENT.shoes} compact index={1} />
                    </>
                )}

                {/* ── Layout: Standard / Overlayer ─────────────────────── */}
                {!onePieceMode && (
                    <>
                        <AnimatePresence>
                            {showOverlayer && (
                                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }} transition={SPRING_SMOOTH}
                                    style={{ width: '100%', height: '100%' }}>
                                    <ReelTile key={`ol-${spinCount}`} items={pools.overlayers} spinning={spinning}
                                        onSpinEnd={item => handleReelDone('overlayer', item)} delay={750}
                                        accentColor={ACCENT.overlayer} index={0} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ gridColumn: showOverlayer ? 'auto' : '1 / -1', height: '100%' }}>
                            <ReelTile key={`top-${spinCount}`} items={pools.tops} spinning={spinning}
                                onSpinEnd={item => handleReelDone('top', item)} delay={0}
                                accentColor={ACCENT.top} index={showOverlayer ? 1 : 0} />
                        </div>

                        <div style={{ gridColumn: '1 / -1', height: '100%' }}>
                            <ReelTile key={`bottom-${spinCount}`} items={pools.bottoms} spinning={spinning}
                                onSpinEnd={item => handleReelDone('bottom', item)} delay={250}
                                accentColor={ACCENT.bottom} index={showOverlayer ? 2 : 1} />
                        </div>

                        <div style={{ gridColumn: '1 / -1', height: '100%' }}>
                            <ReelTile key={`shoes-${spinCount}`} items={pools.shoes} spinning={spinning}
                                onSpinEnd={item => handleReelDone('shoes', item)} delay={500}
                                accentColor={ACCENT.shoes} compact index={showOverlayer ? 3 : 2} />
                        </div>
                    </>
                )}
            </motion.div>

            {/* ─── Expandable explanation panel (after prompted spin) ──── */}
            <ExplanationPanel
                explanation={explanation}
                visible={showExplanation}
                onClose={() => setShowExplanation(false)}
            />

            {/* ─── [FAB group] OOTD camera + Add drip (bottom-right) ─── */}
            <div style={{
                position: 'absolute', bottom: kbHeight > 0 ? kbHeight + 8 : R.offset,
                right: R.offset, zIndex: 20,
                display: 'flex', flexDirection: 'column', gap: R.fabGap,
                alignItems: 'center',
                transition: 'bottom 0.2s ease',
            }}>
                <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }}
                    style={{
                        width: R.fabMed, height: R.fabMed, borderRadius: '50%', cursor: 'pointer',
                        background: 'rgba(138,43,226,0.18)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(138,43,226,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(138,43,226,0.25)',
                    }}>
                    <Camera size={16} color="var(--electric-purple)" />
                </motion.button>

                <motion.button whileTap={{ scale: 0.85, rotate: 90 }} whileHover={{ scale: 1.1 }}
                    onClick={() => setShowAddModal(true)}
                    style={{
                        width: R.fabLg, height: R.fabLg, borderRadius: '50%', cursor: 'pointer',
                        background: 'var(--cyber-yellow)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
                    }}>
                    <Plus size={20} color="black" />
                </motion.button>
            </div>

            {/* ─── [FAB] Surprise Me dice (bottom-left) ──────────────── */}
            <AnimatePresence>
                {!showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6, y: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                        style={{
                            position: 'absolute',
                            bottom: kbHeight > 0 ? kbHeight + 8 : R.offset,
                            left: R.offset, zIndex: 20,
                            transition: 'bottom 0.2s ease',
                        }}
                    >
                        <motion.button
                            whileTap={{ scale: 0.78, rotate: 120 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={handleSpin}
                            animate={spinning
                                ? { boxShadow: ['0 0 0px rgba(255,215,0,0)', '0 0 28px rgba(255,215,0,0.6)', '0 0 0px rgba(255,215,0,0)'] }
                                : { boxShadow: '0 4px 20px rgba(255,215,0,0.4)' }
                            }
                            transition={spinning ? { repeat: Infinity, duration: 0.45 } : {}}
                            style={{
                                width: R.fabXl, height: R.fabXl, borderRadius: '50%', cursor: 'pointer',
                                background: 'var(--cyber-yellow)', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Dices size={19} color="black" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Floating prompt bar (scroll-triggered) ──────────────── */}
            <FloatingPromptBar
                visible={showPrompt}
                prompt={prompt}
                onPromptChange={e => setPrompt(e.target.value)}
                spinning={spinning}
                onSpin={handleSpin}
                kbHeight={kbHeight}
                inputRef={promptInputRef}
                onFocus={() => {
                    promptFocusRef.current = true
                    clearTimeout(promptTimerRef.current) // cancel auto-hide
                }}
                onBlur={() => {
                    promptFocusRef.current = false
                    // Restart auto-hide after losing focus
                    clearTimeout(promptTimerRef.current)
                    promptTimerRef.current = setTimeout(() => setShowPrompt(false), 3000)
                }}
            />

            {/* ─── Add Apparel modal ───────────────────────────────────── */}
            <AnimatePresence>
                {showAddModal && <AddApparelModal onClose={() => setShowAddModal(false)} />}
            </AnimatePresence>
        </div>
    )
}
