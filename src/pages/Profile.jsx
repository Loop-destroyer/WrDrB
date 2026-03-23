import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, ChevronLeft, BarChart3, Award, Palette } from 'lucide-react'
import { USER_PROFILE, TOPS, BOTTOMS, SHOES, ACCESSORIES, getMileage } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

const SKIN_TONES = ['#FDDBB4', '#EDB98A', '#C68642', '#8D5524', '#4A3728', '#2D1B0E']

const WRAPPED_STATS = [
    { icon: '🖤', label: 'Most Worn Color', value: 'Deep Black', sub: '68% of fits', bg: 'linear-gradient(135deg, #1a1a1a, #333)' },
    { icon: '⚡', label: 'Style Soulmate', value: 'Hypebeast', sub: 'Minimalist runner-up', bg: 'linear-gradient(135deg, #8A2BE2, #4a0080)' },
    { icon: '🔥', label: 'Top Fit', value: 'The Daily Driver', sub: '12x this month', bg: 'linear-gradient(135deg, #ff6b6b, #c0392b)' },
    { icon: '👟', label: 'Fav Shoe', value: 'Air Force 1s', sub: '78x worn – Legend 🏆', bg: 'linear-gradient(135deg, #FFD700, #f39c12)' },
]

const ALL_ITEMS = [...TOPS, ...BOTTOMS, ...SHOES, ...ACCESSORIES]

export default function Profile() {
    const navigate = useNavigate()
    const [skinTone, setSkinTone] = useState(USER_PROFILE.skinTone)
    const [editing, setEditing] = useState(false)
    const [profile, setProfile] = useState(USER_PROFILE)

    return (
        <div className="page-wrapper" style={{ background: 'var(--deep-black)', minHeight: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={22} color="#999" />
                </button>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 800, flex: 1 }}>Identity Hub</span>
                <button
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 50, cursor: 'pointer' }}
                    onClick={() => setEditing(e => !e)}
                >
                    <Edit3 size={13} color="#999" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#999', fontFamily: 'var(--font-heading)' }}>{editing ? 'Done' : 'Edit'}</span>
                </button>
            </div>

            {/* Profile Hero */}
            <div style={{ padding: '8px 16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="profile-avatar">
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🧑🏾</div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900 }}>{profile.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{profile.handle}</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                        {[
                            { label: 'Fits', val: profile.totalFits },
                            { label: 'Followers', val: profile.followers.toLocaleString() },
                            { label: 'Following', val: profile.following },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 800 }}>{s.val}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Biometrics */}
            <div style={{ margin: '0 16px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={16} color="var(--electric-purple)" /> Biometrics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Height</span>
                        {editing
                            ? <input className="text-input" style={{ width: 100, padding: '6px 10px', fontSize: 13 }} value={profile.height} onChange={e => setProfile(p => ({ ...p, height: e.target.value }))} />
                            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700 }}>{profile.height}</span>
                        }
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Size</span>
                        {editing
                            ? <input className="text-input" style={{ width: 100, padding: '6px 10px', fontSize: 13 }} value={profile.size} onChange={e => setProfile(p => ({ ...p, size: e.target.value }))} />
                            : <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700 }}>{profile.size}</span>
                        }
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Skin Tone</span>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{skinTone}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {SKIN_TONES.map(tone => (
                                <button
                                    key={tone}
                                    className={`skin-tone-swatch ${skinTone === tone ? 'selected' : ''}`}
                                    style={{ background: tone }}
                                    onClick={() => setSkinTone(tone)}
                                />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Style Archetype</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, background: 'rgba(138,43,226,0.15)', border: '1px solid rgba(138,43,226,0.3)', color: 'var(--electric-purple)', padding: '3px 10px', borderRadius: 20 }}>{profile.styleArchetype}</span>
                    </div>
                </div>
            </div>

            {/* Style Wrapped */}
            <div style={{ padding: '0 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <BarChart3 size={16} color="var(--cyber-yellow)" />
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, color: 'var(--cyber-yellow)' }}>Style Wrapped ✨</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {WRAPPED_STATS.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            style={{ background: stat.bg, borderRadius: 16, padding: 14, position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, marginTop: 2, lineHeight: 1.3 }}>{stat.value}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{stat.sub}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Mileage Tracker */}
            <div style={{ margin: '16px 16px 0' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={16} color="var(--accent-cyan)" /> Mileage Tracker
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ALL_ITEMS.slice(0, 6).map(item => {
                        const mileage = getMileage(item.wornCount)
                        const pct = Math.min((item.wornCount / 70) * 100, 100)
                        return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}>
                                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    <div style={{ height: 4, background: 'var(--card-border)', borderRadius: 2, marginTop: 6 }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: mileage.color, borderRadius: 2, transition: 'width 0.6s' }} />
                                    </div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: mileage.color, fontFamily: 'var(--font-heading)', flexShrink: 0, textAlign: 'right' }}>
                                    {item.wornCount}x<br />
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{mileage.label}</span>
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={{ height: 24 }} />
        </div>
    )
}
