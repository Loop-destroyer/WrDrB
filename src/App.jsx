import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudSun, Bell, User, Zap, ShoppingBag, Users2, Shirt } from 'lucide-react'
import DripRoulette from './pages/DripRoulette'
import Vault from './pages/Vault'
import Marketplace from './pages/Marketplace'
import Feed from './pages/Feed'
import Profile from './pages/Profile'

const pageVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

const pageTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
}

const TABS = [
  { path: '/', label: 'Drip', icon: <Zap size={20} />, emoji: '🎰' },
  { path: '/vault', label: 'Vault', icon: <Shirt size={20} />, emoji: '👕' },
  { path: '/plug', label: 'Plug', icon: <ShoppingBag size={20} />, emoji: '🛒' },
  { path: '/feed', label: 'Feed', icon: <Users2 size={20} />, emoji: '🎥' },
]

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)
  const containerRef = useRef(null)

  const currentTabIdx = TABS.findIndex(t => t.path === location.pathname)
  const prevTabIdx = useRef(currentTabIdx)

  // Determine slide direction
  const direction = currentTabIdx >= prevTabIdx.current ? 1 : -1
  useEffect(() => { prevTabIdx.current = currentTabIdx }, [currentTabIdx])

  // Reset nav bar visibility and scroll position on tab change
  useEffect(() => {
    setNavHidden(false)
    lastScrollY.current = 0
  }, [location.pathname])

  // Auto-hide nav: use capture-phase listener on the phone-frame container
  // This catches scroll events from ALL scrollable children (page-content, feed-reel, etc.)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = (e) => {
      const scrollable = e.target
      // Ignore scrolls that aren't meaningful scroll containers
      if (scrollable === document || scrollable === document.body) return
      const currentY = scrollable.scrollTop
      const diff = currentY - lastScrollY.current
      if (diff > 8 && currentY > 40) {
        setNavHidden(true)
      } else if (diff < -8) {
        setNavHidden(false)
      }
      lastScrollY.current = currentY
    }
    el.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => el.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return (
    <div className="phone-frame">
      <div className="app-shell">
        {/* Top Bar */}
        <header className="top-bar">
          <span className="top-bar-logo">WrDrB</span>
          <div className="weather-widget">
            <CloudSun size={13} />
            <span className="weather-temp">72°F</span>
            <span>It's sunny – Wear light!</span>
          </div>
          <div className="top-bar-right">
            <button className="btn-icon" style={{ width: 36, height: 36 }} onClick={() => navigate('/profile')}>
              <Bell size={16} color="#999" />
            </button>
            <button className="btn-icon" style={{ width: 36, height: 36 }} onClick={() => navigate('/profile')}>
              <User size={16} color="#999" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div
          className="page-content"
          ref={containerRef}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Routes location={location}>
                <Route path="/" element={<DripRoulette />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/plug" element={<Marketplace />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Nav Bar */}
        <nav className={`nav-bar ${navHidden ? 'hidden' : ''}`}>
          {TABS.map((tab, i) => {
            const isActive = location.pathname === tab.path
            return (
              <button
                key={tab.path}
                className={`nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => navigate(tab.path)}
              >
                <span className="nav-icon">{tab.emoji}</span>
                <span className="nav-label">{tab.label}</span>
                {isActive && <span className="nav-tab-indicator" />}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
