import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Lightbulb, ShoppingBag, X } from 'lucide-react'
import { FEED_POSTS, MARKETPLACE_ITEMS } from '../data/mockData'

function ItemTagPopup({ item, onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={onClose}
        >
            <div style={{ background: '#111', borderRadius: 20, padding: 20, width: '100%', maxWidth: 280 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800 }}>Tagged Item</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#666" /></button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 60, height: 60, background: '#222', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        {item.emoji}
                    </div>
                    <div>
                        <div style={{ fontSize: 9, color: 'var(--electric-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.brand}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800 }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 900, color: 'var(--cyber-yellow)', marginTop: 2 }}>{item.price}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 12 }}>To Vault</button>
                    <button className="btn-primary" style={{ flex: 1, padding: '10px 0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <ShoppingBag size={13} /> Buy
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

function FeedCard({ post }) {
    const [liked, setLiked] = useState(false)
    const [likes, setLikes] = useState(post.likes)
    const [activeTag, setActiveTag] = useState(null)

    return (
        <div className="feed-card" style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* BG */}
            <div style={{ position: 'absolute', inset: 0, background: post.bg }} />

            {/* Fit Display (mock video frame) */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.05)', userSelect: 'none', textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                    <div style={{ fontSize: 80, marginBottom: 8 }}>{post.ft.top?.emoji}</div>
                    <div style={{ fontSize: 60 }}>{post.ft.bottom?.emoji}</div>
                    <div style={{ fontSize: 60, marginTop: 4 }}>{post.ft.shoes?.emoji}</div>
                </div>
            </div>

            {/* Overlay gradient */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }} />

            {/* Item tags */}
            {post.tags && post.tags.map((tag, i) => (
                <button
                    key={i}
                    onClick={() => setActiveTag(tag)}
                    style={{ position: 'absolute', top: `${25 + i * 20}%`, left: `${20 + i * 30}%`, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,215,0,0.9)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, boxShadow: '0 0 12px rgba(255,215,0,0.5)', animation: 'pulse-glow 2s ease-in-out infinite' }}
                >
                    🏷️
                </button>
            ))}

            {/* Right action column */}
            <div style={{ position: 'absolute', right: 12, bottom: 120, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
                {[
                    {
                        icon: <Heart size={24} fill={liked ? '#FF006E' : 'none'} color={liked ? '#FF006E' : 'white'} />,
                        label: liked ? likes + 1 : likes,
                        action: () => { setLiked(l => !l) }
                    },
                    { icon: <MessageCircle size={24} color="white" />, label: post.comments },
                    { icon: <Share2 size={24} color="white" />, label: post.shares },
                    { icon: <Lightbulb size={24} color="var(--cyber-yellow)" />, label: 'Suggest' },
                ].map((btn, i) => (
                    <button key={i} onClick={btn.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {btn.icon}
                        <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>
                            {typeof btn.label === 'number' ? (btn.label >= 1000 ? `${(btn.label / 1000).toFixed(1)}k` : btn.label) : btn.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Bottom info */}
            <div style={{ position: 'absolute', bottom: 24, left: 16, right: 76 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyber-yellow), var(--electric-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {post.avatar}
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 800 }}>{post.user}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{post.ft.style} · Fit Score ★ {post.ft.rating}</div>
                    </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{post.caption}</div>
                {post.tags && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {post.tags.map((t, i) => (
                            <button key={i} onClick={() => setActiveTag(t)} style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--cyber-yellow)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-heading)' }}>
                                🏷️ {t.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tag popup */}
            <AnimatePresence>
                {activeTag && <ItemTagPopup item={activeTag} onClose={() => setActiveTag(null)} />}
            </AnimatePresence>
        </div>
    )
}

export default function Feed() {
    return (
        <div style={{ height: '100%', position: 'relative' }}>
            <div className="feed-reel" style={{ height: '100%' }}>
                {FEED_POSTS.map(post => (
                    <div key={post.id} style={{ height: '100%', scrollSnapAlign: 'start', flexShrink: 0, position: 'relative' }}>
                        <FeedCard post={post} />
                    </div>
                ))}
            </div>
            {/* Scroll hint */}
            <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.4 }}>
                <span style={{ fontSize: 10, color: 'white', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Swipe up</span>
                <span style={{ fontSize: 16 }}>↑</span>
            </div>
        </div>
    )
}
