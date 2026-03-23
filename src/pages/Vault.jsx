import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Heart, Clock, X, ChevronRight, Zap, BarChart2 } from 'lucide-react'
import { TOPS, BOTTOMS, SHOES, ACCESSORIES, OVERLAYERS, ONE_PIECES, FITS } from '../data/mockData'
import AddApparelModal from '../components/AddApparelModal'
import PokemonCard from '../components/PokemonCard'

const ALL_ITEMS = [...TOPS, ...BOTTOMS, ...SHOES, ...ACCESSORIES, ...OVERLAYERS, ...ONE_PIECES]

const CATEGORY_COLORS = {
    'One-Piece': '#8A2BE2',
    'Bling':     '#4B0082',
    'Bottoms':   '#00BFFF',
    'Overlayer': '#32CD32',
    'Tops':      '#FFD700',
    'Shoes':     '#FF4500',
    'Fits':      '#FF006E',
}

const FILTER_OPTIONS = [
    { key: 'all',        label: 'All' },
    { key: 'fits',       label: '🔥 Fits' },
    { key: 'Tops',       label: '👕 Tops' },
    { key: 'Bottoms',    label: '👖 Bottoms' },
    { key: 'Shoes',      label: '👟 Shoes' },
    { key: 'Bling',      label: '💎 Bling' },
    { key: 'Overlayer',  label: '🧥 Overlayers' },
    { key: 'One-Piece',  label: '👗 One-Pieces' },
]

// ── See All Modal ──────────────────────────────────────────────────────────────
function SeeAllModal({ title, items, isFits, onSelect, onClose, favorites = new Set() }) {
    return (
        <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
            <motion.div
                onClick={e => e.stopPropagation()}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{
                    width: '100%', maxWidth: 500,
                    background: '#111',
                    borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 -16px 48px rgba(0,0,0,0.85)'
                }}
            >
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #222' }}>
                    <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 14px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 900, color: '#fff' }}>{title}</span>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="hide-scroll" style={{ overflowY: 'auto', padding: '12px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {isFits ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14, justifyContent: 'center' }}>
                            {items.map(fit => (
                                <FitCard
                                    key={fit.id}
                                    fit={fit}
                                    isFav={favorites.has(fit.id)}
                                    onOpen={() => { onSelect(fit); onClose() }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                            {items.map(item => {
                                const catColor = CATEGORY_COLORS[item.category] || '#555'
                                return (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { onSelect(item); onClose() }}
                                        style={{
                                            height: 110,
                                            borderRadius: 16,
                                            background: item.shiny
                                                ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF006E 100%)'
                                                : '#1a1a1a',
                                            border: `3px solid ${catColor}`,
                                            boxShadow: item.shiny
                                                ? `0 0 18px ${catColor}99, 0 6px 16px rgba(0,0,0,0.4)`
                                                : '0 4px 10px rgba(0,0,0,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                        }}
                                    >
                                        {item.image
                                            ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <span style={{ fontSize: 36 }}>{item.emoji}</span>
                                        }
                                        {favorites.has(item.id) && (
                                            <div style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, background: '#FF006E', borderRadius: '50%', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Heart size={9} color="#fff" fill="#fff" />
                                            </div>
                                        )}
                                        {item.shiny && (
                                            <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 800, color: '#FFD700' }}>
                                                ✦ SHINY
                                            </div>
                                        )}
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)',
                                            padding: '3px 0', textAlign: 'center',
                                            fontSize: 10, fontWeight: 800, color: '#fff',
                                            fontFamily: 'var(--font-heading)'
                                        }}>
                                            XP {item.stylePoints || 80}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

// ── My Fits Card (redesigned per image 2) ─────────────────────────────────────
function FitCard({ fit, isFav, onOpen }) {
    const pieces = [fit.top, fit.overlayer ?? null, fit.bottom, fit.shoes]
    const rating = fit.rating ?? 8
    const worn   = fit.wornCount ?? 0
    const dripPct = (rating / 10) * 100

    const tags = [
        fit.style    && { label: fit.style,    bg: '#2a1a00', color: '#FFD700' },
        fit.season   && { label: fit.season,   bg: '#0a2a0a', color: '#39FF14' },
        fit.occasion && { label: fit.occasion, bg: '#210d3a', color: '#a688fa' },
    ].filter(Boolean)

    return (
        <motion.div
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpen}
            style={{
                flex: '0 0 200px', cursor: 'pointer', position: 'relative',
                borderRadius: 16, background: '#f5d849', padding: 9,
                boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
            }}
        >
            {/* Inner frame */}
            <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* ── TOP: Header strip ── */}
                <div style={{ padding: '5px 8px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, fontStyle: 'italic', color: '#aaa', letterSpacing: 1 }}>TRAINER FIT</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 900, color: '#e30000' }}>XP {fit.stylePoints || Math.round(rating * 10)}</span>
                </div>

                {/* ── TOP HALF: 2×2 image grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#18181f', padding: 4, height: 120 }}>
                    {pieces.map((piece, i) => (
                        <div key={i} style={{
                            background: piece ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                            borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            {piece?.image
                                ? <img src={piece.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: piece ? 20 : 13, color: piece ? '#fff' : '#333' }}>{piece?.emoji || '+'}</span>
                            }
                            {piece && (
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(0,0,0,0.72)', fontSize: 7, fontWeight: 800,
                                    color: '#fff', textAlign: 'center', padding: '1px 3px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{piece.name}</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── FIT NAME ── */}
                <div style={{ padding: '6px 8px 3px' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>{fit.name}</div>
                </div>

                {/* ── BOTTOM HALF: Meters + reason + occasions ── */}
                <div style={{ padding: '4px 8px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>

                    {/* Drip meter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={10} color="#FF4500" style={{ flexShrink: 0 }}/>
                        <div style={{ flex: 1, height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${dripPct}%`, height: '100%', background: 'linear-gradient(90deg, #32CD32, #FFD700, #FF4500)', borderRadius: 3 }}/>
                        </div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 900, color: '#e30000', flexShrink: 0 }}>{rating}</span>
                    </div>

                    {/* Times worn */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={9} color="#999" style={{ flexShrink: 0 }}/>
                        <div style={{ flex: 1, height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min((worn / 30) * 100, 100)}%`, height: '100%', background: '#00BFFF', borderRadius: 2 }}/>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#555', flexShrink: 0 }}>{worn}x</span>
                    </div>

                    {/* Brief reason */}
                    {fit.vibe && (
                        <div style={{ fontSize: 8, color: '#666', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {fit.vibe}
                        </div>
                    )}

                    {/* Occasions */}
                    {fit.occasion && (
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#7c3aed' }}>
                            📅 {fit.occasion}
                        </div>
                    )}
                </div>

                {/* ── TAGS row ── */}
                {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '4px 8px 7px', borderTop: '1px solid #f0f0f0', marginTop: 'auto' }}>
                        {tags.map(t => (
                            <span key={t.label} style={{ background: t.bg, color: t.color, fontSize: 8, fontWeight: 700, borderRadius: 20, padding: '2px 7px', border: `1px solid ${t.color}33` }}>
                                {t.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Fav ribbon */}
            {isFav && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, background: '#FF006E', borderBottomLeftRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Heart size={11} color="#fff" fill="#fff" />
                </div>
            )}
        </motion.div>
    )
}

// ── Main Vault Component ────────────────────────────────────────────────────────
export default function Vault() {
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedCard, setSelectedCard] = useState(null)
    const [search, setSearch]             = useState('')
    const [activeFilter, setActiveFilter] = useState('all')
    const [seeAllData, setSeeAllData]     = useState(null)
    const [favorites, setFavorites]       = useState(
        new Set(ALL_ITEMS.filter(i => i.favorite).map(i => i.id))
    )

    const toggleFav = (id) => setFavorites(prev => {
        const s = new Set(prev)
        s.has(id) ? s.delete(id) : s.add(id)
        return s
    })

    const categories = [
        { label: '👕 Tops',       key: 'Tops',      items: TOPS,       color: CATEGORY_COLORS['Tops'] },
        { label: '👖 Bottoms',    key: 'Bottoms',   items: BOTTOMS,    color: CATEGORY_COLORS['Bottoms'] },
        { label: '👟 Shoes',      key: 'Shoes',     items: SHOES,      color: CATEGORY_COLORS['Shoes'] },
        { label: '💎 Bling',      key: 'Bling',     items: ACCESSORIES,color: CATEGORY_COLORS['Bling'] },
        { label: '🧥 Overlayers', key: 'Overlayer', items: OVERLAYERS, color: CATEGORY_COLORS['Overlayer'] },
        { label: '👗 One-Pieces', key: 'One-Piece', items: ONE_PIECES, color: CATEGORY_COLORS['One-Piece'] },
    ]

    // Determine which sections to show based on activeFilter
    const showFits  = activeFilter === 'all' || activeFilter === 'fits'
    const showCats  = activeFilter === 'all' || !['fits'].includes(activeFilter)

    const filteredCategory = (cat) => {
        if (activeFilter !== 'all' && activeFilter !== 'fits' && activeFilter !== cat.key) return []
        const q = search.toLowerCase()
        return cat.items.filter(i =>
            !q || i.name.toLowerCase().includes(q) || i.archetype.toLowerCase().includes(q)
        )
    }

    const filteredFits = useMemo(() => {
        if (!showFits) return []
        const q = search.toLowerCase()
        return FITS.filter(f => !q || f.name.toLowerCase().includes(q) || (f.style||'').toLowerCase().includes(q))
    }, [search, showFits])

    return (
        <div className="page-wrapper" style={{ background: 'var(--deep-black)', minHeight: '100%' }}>

            {/* ── Search Bar ──────────────────────────────────────────── */}
            <div style={{ padding: '12px 16px 0px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                    background: '#1c1c1c',
                    border: '1.5px solid #383838',
                    borderRadius: 50, padding: '10px 16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
                }}>
                    <Search size={15} color="#777" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search your vault..."
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, flex: 1
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0 }}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--cyber-yellow)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={20} color="black" />
                </button>
            </div>

            {/* ── Filter Chips ──────────────────────────────────────────── */}
            <div className="hide-scroll" style={{ display: 'flex', gap: 6, padding: '10px 16px 8px', overflowX: 'auto' }}>
                {FILTER_OPTIONS.map(f => {
                    const isActive = activeFilter === f.key
                    const accentColor = f.key === 'all' ? '#FFD700' : (CATEGORY_COLORS[f.key] || CATEGORY_COLORS['Fits'])
                    return (
                        <motion.button
                            key={f.key}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => setActiveFilter(f.key)}
                            style={{
                                flexShrink: 0,
                                background: isActive ? accentColor : '#1c1c1c',
                                border: `1.5px solid ${isActive ? accentColor : '#333'}`,
                                color: isActive ? '#000' : '#aaa',
                                fontFamily: 'var(--font-body)',
                                fontSize: 11, fontWeight: 700,
                                borderRadius: 50, padding: '5px 13px',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                boxShadow: isActive ? `0 0 10px ${accentColor}66` : 'none',
                            }}
                        >
                            {f.label}
                        </motion.button>
                    )
                })}
            </div>

            {/* ── Stats Row ───────────────────────────────────────────── */}
            <div className="hide-scroll" style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto' }}>
                {[
                    { icon: '👑', label: 'Total Drip', value: ALL_ITEMS.length },
                    { icon: '💛', label: 'Favs',       value: favorites.size },
                    { icon: '🔥', label: 'Fits',       value: FITS.length },
                    { icon: '⭐', label: 'Avg XP',     value: Math.round(ALL_ITEMS.reduce((a, i) => a + i.stylePoints, 0) / ALL_ITEMS.length) },
                ].map(s => (
                    <div key={s.label} style={{ flexShrink: 0, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '8px 14px', textAlign: 'center', minWidth: 68 }}>
                        <div style={{ fontSize: 18 }}>{s.icon}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 800, color: 'var(--cyber-yellow)' }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── My Fits ─────────────────────────────────────────────── */}
            {showFits && filteredFits.length > 0 && (
                <div style={{ padding: '0 16px', marginBottom: 26 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 800, color: '#fff' }}>🔥 My Fits</span>
                        <button
                            onClick={() => setSeeAllData({ title: 'All Fits', items: FITS, isFits: true })}
                            style={{ background: 'none', border: 'none', color: '#a688fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                            See All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 10 }}>
                        {filteredFits.map(fit => (
                            <FitCard
                                key={fit.id}
                                fit={fit}
                                isFav={favorites.has(fit.id)}
                                onOpen={() => setSelectedCard({ ...fit, _isFit: true, category: 'Fit' })}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Category Icon Grids ──────────────────────────────────── */}
            {showCats && categories.map(cat => {
                const filtered = filteredCategory(cat)
                if (filtered.length === 0) return null

                return (
                    <div key={cat.key} style={{ padding: '0 16px', marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 800, color: cat.color }}>{cat.label}</span>
                            <button
                                onClick={() => setSeeAllData({ title: cat.label, items: cat.items, isFits: false })}
                                style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                            >
                                See All <ChevronRight size={13} />
                            </button>
                        </div>
                        {/* Larger grid — ~100px min per cell */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                            {filtered.map(item => (
                                <motion.div
                                    key={item.id}
                                    whileHover={{ scale: 1.08, y: -5 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => setSelectedCard(item)}
                                    style={{
                                        height: 110,
                                        borderRadius: 16,
                                        background: item.shiny
                                            ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF006E 100%)'
                                            : '#1a1a1a',
                                        border: `3px solid ${cat.color}`,
                                        boxShadow: item.shiny
                                            ? `0 0 18px ${cat.color}99, 0 6px 16px rgba(0,0,0,0.4)`
                                            : '0 4px 10px rgba(0,0,0,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                        transition: 'box-shadow 0.2s',
                                    }}
                                >
                                    {item.image
                                        ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: 36 }}>{item.emoji}</span>
                                    }

                                    {/* Fav dot */}
                                    {favorites.has(item.id) && (
                                        <div style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, background: '#FF006E', borderRadius: '50%', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Heart size={9} color="#fff" fill="#fff" />
                                        </div>
                                    )}

                                    {/* Shiny badge */}
                                    {item.shiny && (
                                        <div style={{ position: 'absolute', top: 5, left: 5, fontSize: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '1px 4px' }}>✨</div>
                                    )}

                                    {/* XP banner */}
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)',
                                        padding: '3px 0', textAlign: 'center',
                                        fontSize: 10, fontWeight: 800, color: '#fff',
                                        fontFamily: 'var(--font-heading)'
                                    }}>
                                        XP {item.stylePoints || 80}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            })}

            <div style={{ height: 20 }} />

            {/* ── Modals ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddModal && <AddApparelModal onClose={() => setShowAddModal(false)} />}

                {selectedCard && (
                    <PokemonCard
                        key={selectedCard.id}
                        item={selectedCard}
                        onClose={() => setSelectedCard(null)}
                        isFavorite={favorites.has(selectedCard.id)}
                        onToggleFav={() => toggleFav(selectedCard.id)}
                        FITS={FITS}
                    />
                )}

                {seeAllData && (
                    <SeeAllModal
                        title={seeAllData.title}
                        items={seeAllData.items}
                        isFits={seeAllData.isFits}
                        onSelect={item => setSelectedCard(seeAllData.isFits ? { ...item, _isFit: true, category: 'Fit' } : item)}
                        onClose={() => setSeeAllData(null)}
                        favorites={favorites}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
