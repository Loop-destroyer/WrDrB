import { motion } from 'framer-motion'
import { X, Heart, Clock, Zap, Star } from 'lucide-react'
import { getCondition, getMileage } from '../data/mockData'

const MOCK_WORN_PHOTOS = ['😎🪞', '🛒🛍️', '🏙️🌆', '☕📖']

export default function CardDetailPopup({ item, onClose, isFavorite, onToggleFav }) {
    const condition = getCondition(item.wornCount)
    const mileage = getMileage(item.wornCount)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={e => e.stopPropagation()}
                style={{ paddingBottom: 32 }}
            >
                <div className="modal-handle" />
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--electric-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.category || item.style}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.brand || item.archetype}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                            onClick={onToggleFav}
                            style={{ width: 44, height: 44, borderRadius: '50%', background: isFavorite ? 'rgba(255,0,110,0.15)' : 'var(--glass-bg)', border: `1px solid ${isFavorite ? 'rgba(255,0,110,0.4)' : 'var(--glass-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                            <Heart size={18} fill={isFavorite ? '#FF006E' : 'none'} color={isFavorite ? '#FF006E' : '#666'} />
                        </button>
                        <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={18} color="#666" />
                        </button>
                    </div>
                </div>

                {/* Image */}
                <div style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {item.image
                        ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 80 }}>{item.emoji || '👕'}</span>
                    }
                    {/* Holo overlay on favorites */}
                    {isFavorite && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(138,43,226,0.08), rgba(0,245,255,0.08))', mixBlendMode: 'screen' }} />
                    )}
                </div>

                {/* XP Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                        { icon: <Star size={16} color="var(--cyber-yellow)" />, label: 'Style XP', value: item.stylePoints || item.rating * 10 | 0 },
                        { icon: <Clock size={16} color="var(--accent-cyan)" />, label: 'Worn', value: `${item.wornCount}x` },
                        { icon: <Zap size={16} color="var(--accent-green)" />, label: 'Archetype', value: item.archetype || item.style },
                    ].map((s, i) => (
                        <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Condition */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Condition Meter</span>
                        <span className={`condition-badge ${condition.class}`}>{condition.label}</span>
                    </div>
                    <div className="condition-meter">
                        <div className="condition-fill" style={{
                            width: `${condition.fill}%`,
                            background: condition.class === 'mint' ? 'var(--accent-green)'
                                : condition.class === 'street' ? 'var(--cyber-yellow)'
                                    : condition.class === 'vintage' ? '#FF6B6B' : '#888'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Mint</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Beat</span>
                    </div>
                </div>

                {/* Mileage */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mileage Status</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800, color: mileage.color }}>{mileage.label}</span>
                </div>

                {/* Worn photos strip */}
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Worn In</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {MOCK_WORN_PHOTOS.map((photo, i) => (
                            <div key={i} style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                                {photo}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
