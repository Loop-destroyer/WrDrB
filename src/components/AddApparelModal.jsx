/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AddApparelModal.jsx — Add New Wardrobe Item
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three-step modal flow:
 *   Step 1: Choose source (Gallery or Camera)
 *   Step 2: Fill in item details (name, size, brand, type)
 *   Step 3: Tag Your Drip — colorful tag pills with auto-suggestions
 *
 * Tags are persisted via tagStore (localStorage) and can be
 * searched/filtered in the Vault tab.
 *
 * @module AddApparelModal
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ChevronLeft, Plus, X, Hash, Sparkles } from 'lucide-react'
import { getSuggestedTags, getTagColor, addCustomTag, getCustomTags } from '../utils/tagStore'

// ── Animation presets ───────────────────────────────────────────────────────
const SPRING_SHEET = { type: 'spring', stiffness: 300, damping: 30 }
const SPRING_TAG = { type: 'spring', stiffness: 400, damping: 24 }

// ── Category options ────────────────────────────────────────────────────────
const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Bling', 'Overlayer', 'One-Piece']


export default function AddApparelModal({ onClose, onAdd }) {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        name: 'Auto-detected Item',
        size: 'L',
        type: 'Tops',
        brand: '',
        color: '',
    })
    const [selectedTags, setSelectedTags] = useState([])
    const [customInput, setCustomInput] = useState('')
    const [added, setAdded] = useState(false)
    const customInputRef = useRef(null)

    /* ── Tag management ─────────────────────────────────────────────── */
    const suggestedTags = getSuggestedTags(form.type, selectedTags)
    const customTags = getCustomTags()
    const allAvailable = [...new Set([...suggestedTags, ...customTags])]

    function toggleTag(tag) {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    function handleCustomTag() {
        const raw = customInput.trim()
        if (!raw) return
        const normalized = addCustomTag(raw) // persists to localStorage
        if (!selectedTags.includes(normalized)) {
            setSelectedTags(prev => [...prev, normalized])
        }
        setCustomInput('')
        customInputRef.current?.focus()
    }

    function handleCustomKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCustomTag()
        }
    }

    /* ── Final add ─────────────────────────────────────────────────── */
    function handleAdd() {
        const item = {
            id: `user-${Date.now()}`,
            name: form.name,
            category: form.type,
            size: form.size,
            brand: form.brand,
            color: form.color || '#888888',
            tags: selectedTags,
            stylePoints: Math.floor(Math.random() * 30) + 70,
            wornCount: 0,
            favorite: false,
            emoji: form.type === 'Tops' ? '👕' : form.type === 'Bottoms' ? '👖' : form.type === 'Shoes' ? '👟' : '✨',
        }
        setAdded(true)
        onAdd?.(item)
        setTimeout(onClose, 1200)
    }

    /* ── Render ─────────────────────────────────────────────────────── */
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={SPRING_SHEET}
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
                <div className="modal-handle" />

                {/* ═══════════════════════════════════════════════════════
                    Step 1: Choose Source
                   ═══════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <>
                        <h2 style={styles.heading}>Drop Your Fit 🔥</h2>
                        <p style={styles.subtitle}>Add from gallery or snap a pic</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { emoji: '📷', label: 'Add from Gallery', bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.2)', iconComp: null },
                                { emoji: null, label: 'Take a Picture', bg: 'rgba(138,43,226,0.1)', border: 'rgba(138,43,226,0.2)', iconComp: <Camera size={20} color="var(--electric-purple)" /> },
                            ].map((opt, i) => (
                                <button key={i} style={styles.sourceBtn} onClick={() => setStep(2)}>
                                    <div style={{ ...styles.sourceIcon, background: opt.bg, border: `1px solid ${opt.border}` }}>
                                        {opt.iconComp || <span style={{ fontSize: 20 }}>{opt.emoji}</span>}
                                    </div>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ═══════════════════════════════════════════════════════
                    Step 2: Item Details
                   ═══════════════════════════════════════════════════════ */}
                {step === 2 && (
                    <>
                        <StepHeader onBack={() => setStep(1)} title="Style It Up" />
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            {['👕', '📸'].map((e, i) => (
                                <div key={i} style={styles.thumbPlaceholder}>{e}</div>
                            ))}
                            <div style={{ ...styles.thumbPlaceholder, flexDirection: 'column', gap: 4 }}>
                                <Plus size={20} color="#555" />
                                <span style={{ fontSize: 10, color: '#555' }}>More</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                            {[
                                { label: 'Name', key: 'name' },
                                { label: 'Size', key: 'size' },
                                { label: 'Brand', key: 'brand' },
                                { label: 'Color Hex', key: 'color', placeholder: '#FFFFFF' },
                            ].map(({ label, key, placeholder }) => (
                                <div key={key}>
                                    <label style={styles.label}>{label}</label>
                                    <input
                                        className="text-input"
                                        value={form[key]}
                                        placeholder={placeholder || label}
                                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={styles.label}>Type</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {CATEGORIES.map(t => (
                                        <button
                                            key={t}
                                            className={`chip ${form.type === t ? 'active' : ''}`}
                                            onClick={() => setForm(p => ({ ...p, type: t }))}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', fontSize: 16 }} onClick={() => setStep(3)}>
                            Next → Tag Your Drip 🏷️
                        </button>
                    </>
                )}

                {/* ═══════════════════════════════════════════════════════
                    Step 3: Tag Your Drip
                   ═══════════════════════════════════════════════════════ */}
                {step === 3 && (
                    <>
                        <StepHeader
                            onBack={() => setStep(2)}
                            title={added ? '🎉 Vault Updated!' : 'Tag Your Drip'}
                        />

                        {/* Info badge */}
                        <div style={styles.infoBadge}>
                            <Sparkles size={14} color="var(--cyber-yellow)" />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Tags help the AI suggest outfits and make your vault searchable
                            </span>
                        </div>

                        {/* Selected tags */}
                        {selectedTags.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ ...styles.label, marginBottom: 8 }}>Selected</label>
                                <div style={styles.tagGrid}>
                                    <AnimatePresence>
                                        {selectedTags.map(tag => {
                                            const c = getTagColor(tag)
                                            return (
                                                <motion.button
                                                    key={tag}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={SPRING_TAG}
                                                    onClick={() => toggleTag(tag)}
                                                    style={{
                                                        ...styles.tagPill,
                                                        background: c.bg,
                                                        border: `1px solid ${c.border}`,
                                                        color: c.text,
                                                    }}
                                                >
                                                    {tag}
                                                    <X size={10} style={{ marginLeft: 4, opacity: 0.6 }} />
                                                </motion.button>
                                            )
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Suggested tags */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ ...styles.label, marginBottom: 8 }}>
                                Suggested for {form.type}
                            </label>
                            <div style={styles.tagGrid}>
                                {allAvailable.filter(t => !selectedTags.includes(t)).map(tag => {
                                    const c = getTagColor(tag)
                                    return (
                                        <motion.button
                                            key={tag}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => toggleTag(tag)}
                                            style={{
                                                ...styles.tagPill,
                                                background: 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${c.border}`,
                                                color: c.text,
                                                opacity: 0.7,
                                            }}
                                        >
                                            + {tag}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Custom tag input */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ ...styles.label, marginBottom: 8 }}>Custom Tag</label>
                            <div style={styles.customInputRow}>
                                <Hash size={14} color="#666" style={{ flexShrink: 0 }} />
                                <input
                                    ref={customInputRef}
                                    value={customInput}
                                    onChange={e => setCustomInput(e.target.value)}
                                    onKeyDown={handleCustomKeyDown}
                                    placeholder="Add your own tag..."
                                    inputMode="text"
                                    enterKeyHint="done"
                                    style={styles.customInputField}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={handleCustomTag}
                                    disabled={!customInput.trim()}
                                    style={{
                                        ...styles.customAddBtn,
                                        opacity: customInput.trim() ? 1 : 0.3,
                                    }}
                                >
                                    <Plus size={14} color="black" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            className="btn-primary"
                            style={{ width: '100%', fontSize: 16 }}
                            onClick={handleAdd}
                        >
                            {added ? '✅ Drip Secured!' : `Add with ${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} 🔥`}
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Component: StepHeader
   ═══════════════════════════════════════════════════════════════════════════ */
function StepHeader({ onBack, title }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <ChevronLeft size={20} color="#999" />
            </button>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800 }}>{title}</h2>
        </div>
    )
}


/* ═══════════════════════════════════════════════════════════════════════════
   Styles (co-located)
   ═══════════════════════════════════════════════════════════════════════════ */
const styles = {
    heading: {
        fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, marginBottom: 6,
    },
    subtitle: {
        color: 'var(--text-muted)', fontSize: 13, marginBottom: 24,
    },
    sourceBtn: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 16, color: 'white', cursor: 'pointer',
        fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
    },
    sourceIcon: {
        width: 44, height: 44, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    thumbPlaceholder: {
        width: 88, height: 88, borderRadius: 12,
        background: 'var(--card-bg)', border: '1px dashed var(--card-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, cursor: 'pointer',
    },
    label: {
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        display: 'block', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    infoBadge: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,215,0,0.06)',
        border: '1px solid rgba(255,215,0,0.15)',
        borderRadius: 12, padding: '8px 12px', marginBottom: 16,
    },
    tagGrid: {
        display: 'flex', flexWrap: 'wrap', gap: 8,
    },
    tagPill: {
        padding: '5px 12px', borderRadius: 50,
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        transition: 'all 0.15s ease',
    },
    customInputRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 50, padding: '6px 12px',
    },
    customInputField: {
        flex: 1, background: 'none', border: 'none', outline: 'none',
        color: 'white', fontFamily: 'var(--font-body)', fontSize: 13,
        minWidth: 0,
    },
    customAddBtn: {
        width: 28, height: 28, borderRadius: '50%', border: 'none',
        background: 'var(--cyber-yellow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
    },
}
