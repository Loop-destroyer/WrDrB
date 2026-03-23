import { Heart } from 'lucide-react'
import { getCondition } from '../data/mockData'

export default function TradingCard({ item, isFavorite, onToggleFav, onClick }) {
    const condition = getCondition(item.wornCount)

    return (
        <div
            className={`trading-card ${isFavorite ? 'favorite' : ''}`}
            onClick={onClick}
            style={{ position: 'relative' }}
        >
            {/* Card image */}
            <div className="card-image">
                {item.image
                    ? <img src={item.image} alt={item.name} />
                    : <span style={{ fontSize: 48 }}>{item.emoji}</span>
                }
            </div>

            {/* Fav button */}
            <button
                onClick={e => { e.stopPropagation(); onToggleFav() }}
                style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
                <Heart size={12} fill={isFavorite ? '#FF006E' : 'none'} color={isFavorite ? '#FF006E' : '#666'} />
            </button>

            {/* Card info */}
            <div className="card-name">{item.name}</div>
            <div className="card-tag">{item.archetype}</div>

            <div className="card-stats" style={{ marginTop: 6, flexWrap: 'wrap', gap: 4 }}>
                <span className="card-stat-pill yellow">⭐ {item.stylePoints}</span>
                <span className={`condition-badge ${condition.class}`}>{condition.label}</span>
            </div>

            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>👕 {item.wornCount}x</span>
                <span>·</span>
                <span>{item.size}</span>
            </div>
        </div>
    )
}
