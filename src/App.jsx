import { useState, useEffect } from 'react'
import { usePrices, useNow, getCurrentEntry, tocents, getPriceClass, getTrendArrow, parseFixedPrice, formatCents } from './hooks/usePrices'
import SettingsBar from './components/SettingsBar'
import SummaryCards from './components/SummaryCards'
import PriceChart from './components/PriceChart'
import Comparison from './components/Comparison'
import BestTimes from './components/BestTimes'

const DEFAULT_FIXED_PRICE = 8.5
const FIXED_PRICE_STORAGE_KEY = 'fixedPrice'
const THEME_STORAGE_KEY = 'theme'
const THEMES = ['light', 'dark']

function readStoredFixedPrice() {
    try {
        return parseFixedPrice(localStorage.getItem(FIXED_PRICE_STORAGE_KEY)) ?? DEFAULT_FIXED_PRICE
    } catch {
        return DEFAULT_FIXED_PRICE
    }
}

function storeFixedPrice(price) {
    try {
        localStorage.setItem(FIXED_PRICE_STORAGE_KEY, String(price))
    } catch {
        // Storage can be unavailable (private mode); the rate then lasts for this visit only.
    }
}

function readInitialTheme() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (THEMES.includes(stored)) return stored
    } catch {
        // Fall through to the system preference.
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storeTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
        // Storage can be unavailable (private mode); the theme then lasts for this visit only.
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
}

function fmtClock(date) {
    return date.toLocaleTimeString('fi-FI', {
        timeZone: 'Europe/Helsinki',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function App() {
    const [fixedPrice, setFixedPrice] = useState(readStoredFixedPrice)
    const { data, loading, error, lastUpdated, retry } = usePrices()
    const [heroVisible, setHeroVisible] = useState(true)
    const [theme, setTheme] = useState(readInitialTheme)

    function changeFixedPrice(price) {
        setFixedPrice(price)
        storeFixedPrice(price)
    }

    // Applied in the click handler as well as the effect, so the chart reads the new
    // theme's colour tokens on the very render that the switch triggers.
    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        storeTheme(next)
        setTheme(next)
    }

    useEffect(() => {
        applyTheme(theme)
    }, [theme])

    // Track hero card visibility for sticky header
    useEffect(() => {
        const hero = document.querySelector('.current-price-hero')
        if (!hero) return
        const obs = new IntersectionObserver(
            ([entry]) => setHeroVisible(entry.isIntersecting),
            { threshold: 0 }
        )
        obs.observe(hero)
        return () => obs.disconnect()
    }, [data])

    const nowMs = useNow()
    const current = data.length ? getCurrentEntry(data, nowMs) : null
    const currentCents = current ? tocents(current.PriceNoTax) : null
    const nextEntry = data.find(p => new Date(p.DateTime).getTime() > nowMs)
    const nextCents = nextEntry ? tocents(nextEntry.PriceNoTax) : null

    useEffect(() => {
        if (currentCents !== null) {
            document.title = `${formatCents(currentCents)} snt — Sähkön hinnat`
        }
    }, [currentCents])

    return (
        <div className="app">
            {!heroVisible && currentCents !== null && (
                <div className={`sticky-price-bar ${getPriceClass(currentCents, fixedPrice)}`}>
                    <div className="sticky-left">
                        <span className="sticky-label">Nyt</span>
                        <span className="sticky-price">{formatCents(currentCents)} snt</span>
                        {nextCents !== null && (
                            <span className={`sticky-trend ${getPriceClass(nextCents, fixedPrice)}`}>
                                <span aria-hidden="true">{getTrendArrow(currentCents, nextCents)} </span>
                                <span className="visually-hidden">Seuraava jakso </span>
                                {formatCents(nextCents)} snt
                            </span>
                        )}
                    </div>
                </div>
            )}

            <header className="app-header">
                <div>
                    <h1>Sähkön spot-hinnat</h1>
                    <p className="app-subtitle">Suomi · sis. ALV 25,5 %</p>
                </div>
                <div className="header-right">
                    {lastUpdated && (
                        <p className="updated-at" role="status">
                            Päivitetty {fmtClock(lastUpdated)}
                        </p>
                    )}
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan'}
                    >
                        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
                    </button>
                </div>
            </header>

            <main>
                {loading && <p className="status-msg" role="status">Ladataan hintoja…</p>}

                {error && (
                    <div className="status-msg error" role="alert">
                        <p>
                            {error}
                            {data.length > 0 && lastUpdated && ` Näytetään klo ${fmtClock(lastUpdated)} haetut hinnat.`}
                        </p>
                        <button type="button" className="retry-btn" onClick={retry}>
                            Yritä uudelleen
                        </button>
                    </div>
                )}

                {!loading && data.length > 0 && (
                    <>
                        <SummaryCards data={data} fixedPrice={fixedPrice} nowMs={nowMs}>
                            <SettingsBar fixedPrice={fixedPrice} onChange={changeFixedPrice} />
                        </SummaryCards>
                        <PriceChart data={data} fixedPrice={fixedPrice} theme={theme} nowMs={nowMs} />
                        <Comparison data={data} fixedPrice={fixedPrice} />
                        <BestTimes data={data} fixedPrice={fixedPrice} nowMs={nowMs} />
                    </>
                )}
            </main>
        </div>
    )
}
