/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AddApparelModal.jsx — Add New Wardrobe Item (with CV Pipeline)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three-step modal flow:
 *   Step 1: Choose source (Gallery or Camera) → triggers CV pipeline
 *   Step 2: Fill in item details (name, size, brand, type) — auto-filled by CV
 *   Step 3: Tag Your Drip — pre-populated CV tags + colorful tag pills
 *
 * CV Pipeline (browser-side, see imageProcessor.js):
 *   • Brightness correction (dark photo fix)
 *   • Background removal (WASM/ONNX via @imgly/background-removal)
 *   • Artistic 2D posterize + outline effect
 *   • Fixed 3:4 aspect ratio (600×800px)
 *   • Dominant color extraction
 *   • Type classification
 *   • Auto-tag generation
 *
 * @module AddApparelModal
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ChevronLeft, Plus, X, Hash, Sparkles, Zap } from 'lucide-react'
import { getSuggestedTags, getTagColor, addCustomTag, getCustomTags } from '../utils/tagStore'
import { processApparelImage } from '../utils/imageProcessor'

// ── Animation presets ───────────────────────────────────────────────────────
const SPRING_SHEET = { type: 'spring', stiffness: 300, damping: 30 }
const SPRING_TAG   = { type: 'spring', stiffness: 400, damping: 24 }

// ── Category options ────────────────────────────────────────────────────────
const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Bling', 'Overlayer', 'One-Piece']

const CATEGORY_EMOJI = {
    Tops: '👕', Bottoms: '👖', Shoes: '👟',
    Bling: '💎', Overlayer: '🧥', 'One-Piece': '👗',
}

// ── Processing animation steps ──────────────────────────────────────────────
const PROCESSING_STEPS = [
    { pct:  5, label: '📸 Loading image…' },
    { pct: 15, label: '💡 Fixing brightness…' },
    { pct: 30, label: '✂️ Removing background…' },
    { pct: 65, label: '🎨 Applying artistic effect…' },
    { pct: 80, label: '📐 Framing your drip…' },
    { pct: 90, label: '🎯 Analyzing colors…' },
    { pct: 95, label: '🏷️ Generating tags…' },
    { pct:100, label: '✅ Done!' },
]

export default function AddApparelModal({ onClose, onAdd, initialStep = 1 }) {
    const [step, setStep]   = useState(initialStep)
    const [form, setForm]   = useState({
        name: '',
        size: 'M',
        type: 'Tops',
        brand: '',
        color: '',
        colorName: '',
        image: null,
        originalImage: null,
    })
    const [selectedTags, setSelectedTags] = useState([])
    const [cvTags, setCvTags]             = useState([])   // auto-detected tags from CV
    const [customInput, setCustomInput]   = useState('')
    const [added, setAdded]               = useState(false)
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [stream, setStream]             = useState(null)
    const [processing, setProcessing]     = useState(false)
    const [processProgress, setProcessProgress] = useState(0)
    const [processLabel, setProcessLabel] = useState('')
    const [processingError, setProcessingError] = useState(null)

    const videoRef      = useRef(null)
    const canvasRef     = useRef(null)
    const fileInputRef  = useRef(null)
    const customInputRef= useRef(null)

    /* ── Camera logic ───────────────────────────────────────────── */
    async function startCamera() {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            setStream(s)
            setIsCameraActive(true)
            if (videoRef.current) videoRef.current.srcObject = s
        } catch (err) {
            console.error('Camera error:', err)
            alert('Could not access camera. Please check permissions.')
        }
    }

    function stopCamera() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null) }
        setIsCameraActive(false)
    }

    async function capturePhoto() {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        stopCamera()
        // Convert canvas to blob → File → CV pipeline
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
            await runCVPipeline(file)
        }, 'image/jpeg', 0.9)
    }

    useEffect(() => {
        if (initialStep === 'camera') { setStep(1); startCamera() }
        return () => stopCamera()
    }, [])

    /* ── CV Pipeline ────────────────────────────────────────────── */
    const runCVPipeline = useCallback(async (file) => {
        setProcessing(true)
        setProcessingError(null)
        setProcessProgress(0)
        setStep('processing')

        function onProgress(label, pct) {
            setProcessLabel(label)
            setProcessProgress(pct)
        }

        try {
            const result = await processApparelImage(file, onProgress)
            // Populate form with CV results
            const detectedType = CATEGORIES.includes(result.detectedType) ? result.detectedType : 'Tops'
            // Use specific subType label for the name (e.g., 'Tee', 'Shirt', 'Hoodie', 'Dress')
            const nameLabel = result.subType || detectedType
            setForm(prev => ({
                ...prev,
                image: result.processedDataUrl,
                originalImage: result.originalDataUrl,
                color: result.dominantColor,
                colorName: result.colorName,
                type: detectedType,
                name: `${result.colorName.charAt(0).toUpperCase() + result.colorName.slice(1)} ${nameLabel}`,
            }))

            setCvTags(result.suggestedTags)
            setSelectedTags(result.suggestedTags.slice(0, 3))  // pre-select top 3
            setProcessProgress(100)
            setTimeout(() => {
                setProcessing(false)
                setStep(2)
            }, 600)
        } catch (err) {
            console.error('[AddApparelModal] CV pipeline error:', err)
            setProcessingError('Could not analyze image. You can still fill in details manually.')
            // Still advance with raw image
            const reader = new FileReader()
            reader.onload = (e) => {
                setForm(prev => ({ ...prev, image: e.target.result, originalImage: e.target.result }))
                setProcessing(false)
                setStep(2)
            }
            reader.readAsDataURL(file)
        }
    }, [])

    /* ── Gallery picker ─────────────────────────────────────────── */
    function handleGalleryPick(e) {
        const file = e.target.files?.[0]
        if (!file) return
        runCVPipeline(file)
    }

    /* ── Tag management ─────────────────────────────────────────── */
    const suggestedTags = getSuggestedTags(form.type, selectedTags)
    const customTags    = getCustomTags()
    const allAvailable  = [...new Set([...suggestedTags, ...customTags])].filter(t => !cvTags.includes(t))

    function toggleTag(tag) {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }

    function handleCustomTag() {
        const raw = customInput.trim()
        if (!raw) return
        const normalized = addCustomTag(raw)
        if (!selectedTags.includes(normalized)) setSelectedTags(prev => [...prev, normalized])
        setCustomInput('')
        customInputRef.current?.focus()
    }

    function handleCustomKeyDown(e) {
        if (e.key === 'Enter') { e.preventDefault(); handleCustomTag() }
    }

    /* ── Final add ──────────────────────────────────────────────── */
    function handleAdd() {
        const item = {
            id: `user-${Date.now()}`,
            name: form.name || `My ${form.type}`,
            category: form.type,
            size: form.size,
            brand: form.brand,
            color: form.color || '#888888',
            colorName: form.colorName || 'gray',
            tags: selectedTags,
            stylePoints: Math.floor(Math.random() * 30) + 70,
            wornCount: 0,
            favorite: false,
            emoji: CATEGORY_EMOJI[form.type] || '✨',
            image: form.image,
            archetype: 'Streetwear',
            description: `A ${form.colorName || ''} ${form.type.toLowerCase()} from your collection.`,
            pairsWith: '',
            clashesWith: '',
            conditionDetails: 'Brand new addition!',
            shiny: false,
        }
        setAdded(true)
        onAdd?.(item)
        setTimeout(onClose, 1200)
    }

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={SPRING_SHEET}
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '92vh', overflowY: 'auto' }}
            >
                <div className="modal-handle" />

                {/* ═══════════════════════════════════════════════════════
                    Step 1: Choose Source
                   ═══════════════════════════════════════════════════════ */}
                {step === 1 && !isCameraActive && (
                    <>
                        <h2 style={styles.heading}>Drop Your Fit 🔥</h2>
                        <p style={styles.subtitle}>AI will analyze, clean, and outline your drip automatically</p>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleGalleryPick}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                {
                                    emoji: '🖼️',
                                    label: 'Add from Gallery',
                                    sublabel: 'Auto-detects type, color & tags',
                                    bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.25)',
                                    action: () => fileInputRef.current?.click(),
                                },
                                {
                                    emoji: null,
                                    label: 'Take a Picture',
                                    sublabel: 'Snap & auto-process instantly',
                                    bg: 'rgba(138,43,226,0.1)', border: 'rgba(138,43,226,0.2)',
                                    iconComp: <Camera size={20} color="var(--electric-purple)" />,
                                    action: startCamera,
                                },
                            ].map((opt, i) => (
                                <button key={i} style={styles.sourceBtn} onClick={opt.action}>
                                    <div style={{ ...styles.sourceIcon, background: opt.bg, border: `1px solid ${opt.border}` }}>
                                        {opt.iconComp || <span style={{ fontSize: 20 }}>{opt.emoji}</span>}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div>{opt.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{opt.sublabel}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* CV feature pills */}
                        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {['✂️ BG Removal', '🎨 2D Outline', '🎯 Color detect', '🏷️ Auto-tags'].map(f => (
                                <span key={f} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 20, padding: '4px 10px', color: 'var(--cyber-yellow)' }}>
                                    {f}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Camera View ── */}
                {step === 1 && isCameraActive && (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <button onClick={stopCamera} style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: 8, color: 'white' }}>
                            <X size={20} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={capturePhoto}
                                style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', border: '5px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    Processing Screen
                   ═══════════════════════════════════════════════════════ */}
                {step === 'processing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 24 }}>
                        <div style={styles.processingOrb}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'var(--cyber-yellow)', borderRightColor: 'var(--electric-purple)' }}
                            />
                            <Sparkles size={20} color="var(--cyber-yellow)" style={{ position: 'absolute' }} />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
                                Analyzing Your Drip
                            </div>
                            <motion.div
                                key={processLabel}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ fontSize: 13, color: 'var(--text-muted)' }}
                            >
                                {processLabel || 'Starting…'}
                            </motion.div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 6, background: 'var(--glass-bg)', borderRadius: 3, overflow: 'hidden' }}>
                            <motion.div
                                animate={{ width: `${processProgress}%` }}
                                transition={{ duration: 0.4 }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--electric-purple), var(--cyber-yellow))', borderRadius: 3 }}
                            />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{processProgress}%</div>

                        {/* Step chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                            {PROCESSING_STEPS.map((s, i) => (
                                <span key={i} style={{
                                    fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
                                    background: processProgress >= s.pct ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${processProgress >= s.pct ? 'rgba(57,255,20,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    color: processProgress >= s.pct ? '#39FF14' : '#555',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {s.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    Step 2: Item Details
                   ═══════════════════════════════════════════════════════ */}
                {step === 2 && (
                    <>
                        <StepHeader onBack={() => setStep(1)} title="Style It Up" />

                        {processingError && (
                            <div style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 12, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#ff8888' }}>
                                ⚠️ {processingError}
                            </div>
                        )}

                        {/* Preview */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                            <div style={{ ...styles.thumbPreview, position: 'relative' }}>
                                {form.image && (
                                    <img src={form.image} alt="processed" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                )}
                                {form.image && (
                                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(57,255,20,0.9)', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: '#000' }}>
                                        ✨ AI
                                    </div>
                                )}
                            </div>
                            {form.originalImage && form.originalImage !== form.image && (
                                <div style={{ ...styles.thumbPreview, opacity: 0.5 }}>
                                    <img src={form.originalImage} alt="original" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: '#999' }}>
                                        ORIG
                                    </div>
                                </div>
                            )}
                            {/* Color swatch */}
                            {form.color && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: form.color, border: '2px solid rgba(255,255,255,0.15)' }} />
                                    <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>{form.colorName}</div>
                                </div>
                            )}
                        </div>

                        {/* CV analysis badge */}
                        {form.color && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                <span style={styles.cvBadge}>🎯 {form.type} detected</span>
                                <span style={styles.cvBadge}>🎨 {form.colorName} tone</span>
                                {cvTags.length > 0 && <span style={styles.cvBadge}>🏷️ {cvTags.length} tags found</span>}
                            </div>
                        )}

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
                                            {CATEGORY_EMOJI[t]} {t}
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

                        <div style={styles.infoBadge}>
                            <Sparkles size={14} color="var(--cyber-yellow)" />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Tags help the AI suggest outfits and make your vault searchable
                            </span>
                        </div>

                        {/* CV auto-detected tags (if any) */}
                        {cvTags.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ ...styles.label, marginBottom: 8 }}>
                                    <Zap size={11} color="var(--cyber-yellow)" style={{ marginRight: 4 }} />
                                    AI Detected
                                </label>
                                <div style={styles.tagGrid}>
                                    {cvTags.map(tag => {
                                        const c = getTagColor(tag)
                                        const isSelected = selectedTags.includes(tag)
                                        return (
                                            <motion.button
                                                key={tag}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => toggleTag(tag)}
                                                style={{
                                                    ...styles.tagPill,
                                                    background: isSelected ? c.bg : 'rgba(255,215,0,0.04)',
                                                    border: `1px solid ${isSelected ? c.border : 'rgba(255,215,0,0.25)'}`,
                                                    color: isSelected ? c.text : 'var(--cyber-yellow)',
                                                    opacity: 1,
                                                }}
                                            >
                                                {isSelected ? '✓ ' : '+ '}{tag}
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected tags */}
                        {selectedTags.filter(t => !cvTags.includes(t)).length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ ...styles.label, marginBottom: 8 }}>Selected</label>
                                <div style={styles.tagGrid}>
                                    <AnimatePresence>
                                        {selectedTags.filter(t => !cvTags.includes(t)).map(tag => {
                                            const c = getTagColor(tag)
                                            return (
                                                <motion.button
                                                    key={tag}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={SPRING_TAG}
                                                    onClick={() => toggleTag(tag)}
                                                    style={{ ...styles.tagPill, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
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
                            <label style={{ ...styles.label, marginBottom: 8 }}>Suggested for {form.type}</label>
                            <div style={styles.tagGrid}>
                                {allAvailable.filter(t => !selectedTags.includes(t)).map(tag => {
                                    const c = getTagColor(tag)
                                    return (
                                        <motion.button
                                            key={tag}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => toggleTag(tag)}
                                            style={{ ...styles.tagPill, background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}`, color: c.text, opacity: 0.7 }}
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
                                    placeholder="Add your own tag…"
                                    inputMode="text"
                                    enterKeyHint="done"
                                    style={styles.customInputField}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={handleCustomTag}
                                    disabled={!customInput.trim()}
                                    style={{ ...styles.customAddBtn, opacity: customInput.trim() ? 1 : 0.3 }}
                                >
                                    <Plus size={14} color="black" />
                                </motion.button>
                            </div>
                        </div>

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
        color: 'var(--text-muted)', fontSize: 12, marginBottom: 20,
    },
    sourceBtn: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 16, color: 'white', cursor: 'pointer',
        fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
        width: '100%', textAlign: 'left',
    },
    sourceIcon: {
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    thumbPreview: {
        width: 96, height: 128, borderRadius: 12, flexShrink: 0,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, overflow: 'hidden', position: 'relative',
    },
    label: {
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        display: 'block', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    infoBadge: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
        borderRadius: 12, padding: '8px 12px', marginBottom: 16,
    },
    cvBadge: {
        fontSize: 10, fontWeight: 700, background: 'rgba(57,255,20,0.07)',
        border: '1px solid rgba(57,255,20,0.25)', borderRadius: 20,
        padding: '3px 10px', color: '#39FF14',
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
        color: 'white', fontFamily: 'var(--font-body)', fontSize: 13, minWidth: 0,
    },
    customAddBtn: {
        width: 28, height: 28, borderRadius: '50%', border: 'none',
        background: 'var(--cyber-yellow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
    },
    processingOrb: {
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(138,43,226,0.2), rgba(255,215,0,0.05))',
        border: '1px solid rgba(138,43,226,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
}
