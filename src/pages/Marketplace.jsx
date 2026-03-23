import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ShoppingBag, Sparkles, ChevronRight } from 'lucide-react'
import { MARKETPLACE_ITEMS, TOPS, BOTTOMS, SHOES } from '../data/mockData'

function ProductDetailModal({ item, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-sheet"
                style={{ maxHeight: '90%' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-handle" />

                {/* Product hero */}
                <div style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16, position: 'relative', background: '#1a1a1a' }}>
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {item.sponsored && (
                        <div className="sponsored-badge">AD</div>
                    )}
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--accent-green)' }}>
                        {item.match}% Match 🎯
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--electric-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.brand}</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, marginTop: 4 }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 900, color: 'var(--cyber-yellow)', marginTop: 8 }}>{item.price}</div>
                </div>

                {/* Synergy Section */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Sparkles size={16} color="var(--cyber-yellow)" />
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, color: 'var(--cyber-yellow)' }}>How to Wear It</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· paired with your vault</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                        {item.synergy && item.synergy.map((piece, i) => (
                            <div key={i} style={{ flexShrink: 0, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
                                <div style={{ width: 44, height: 44, background: '#222', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                    {piece.emoji}
                                </div>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700 }}>{piece.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Your Vault ✓</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" style={{ flex: 1 }}>Save 💛</button>
                    <button className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <ShoppingBag size={16} /> Buy Now
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export default function Marketplace() {
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('All')
    const [selectedItem, setSelectedItem] = useState(null)
    const filters = ['All', 'Tops', 'Bottoms', 'Shoes', 'Bling']

    const filtered = MARKETPLACE_ITEMS.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.brand.toLowerCase().includes(search.toLowerCase())
        const matchFilter = activeFilter === 'All' || item.category === activeFilter
        return matchSearch && matchFilter
    })

    return (
        <div className="page-wrapper" style={{ background: 'var(--deep-black)', minHeight: '100%' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px 8px' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                    The Plug 🛒
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI-curated drops for your style 🤖</div>
            </div>

            {/* Search */}
            <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 50, margin: '0 16px 10px' }}>
                <Search size={15} color="#555" style={{ flexShrink: 0, marginLeft: 4 }} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search drops..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontFamily: 'var(--font-body)', fontSize: 13, flex: 1, paddingTop: 10 }}
                />
            </div>

            {/* Filters */}
            <div className="hide-scroll" style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
                {filters.map(f => (
                    <button key={f} className={`chip ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
                        {f}
                    </button>
                ))}
            </div>

            {/* AI Banner */}
            <div style={{ margin: '0 16px 16px', padding: '14px 16px', background: 'linear-gradient(135deg, rgba(138,43,226,0.2), rgba(0,245,255,0.1))', border: '1px solid rgba(138,43,226,0.3)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🤖</span>
                <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800, color: 'var(--accent-cyan)' }}>Stylist AI Activated</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Scanned your vault · Found {filtered.length} missing pieces</div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="product-grid">
                {filtered.map(item => (
                    <div key={item.id} className="product-card" style={{ position: 'relative' }} onClick={() => setSelectedItem(item)}>
                        <div className="product-image">
                            <img src={item.image} alt={item.name} />
                        </div>
                        {item.sponsored && <div className="sponsored-badge">AD</div>}
                        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: 'var(--accent-green)' }}>
                            {item.match}% 🎯
                        </div>
                        <div className="product-info">
                            <div className="product-brand">{item.brand}</div>
                            <div className="product-name">{item.name}</div>
                            <div className="product-price">{item.price}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ height: 16 }} />

            <AnimatePresence>
                {selectedItem && (
                    <ProductDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}
