import { useState, useEffect } from 'react'

const VAT = 1.255

// VAT is added only to positive prices; negative prices are shown as the bare spot price.
export function tocents(priceNoTax) {
    return priceNoTax < 0 ? priceNoTax * 100 : priceNoTax * VAT * 100
}

export function vatLabel(cents) {
    return cents < 0 ? 'ei ALV:tä' : 'sis. ALV'
}

// Prices are judged against the user's own fixed contract, not the market:
// below it is cheap, up to 40 % above it is moderate, beyond that is expensive.
const MODERATE_LIMIT = 1.4

export function getPriceClass(cents, fixedPrice) {
    if (cents < fixedPrice) return 'cheap'
    if (cents < fixedPrice * MODERATE_LIMIT) return 'moderate'
    return 'expensive'
}

const MIN_FIXED_PRICE = 0.01
const MAX_FIXED_PRICE = 100

// Accepts user or stored input like "8,5" or "8.5"; returns null for anything outside the allowed range.
export function parseFixedPrice(value) {
    const text = String(value ?? '').trim().replace(',', '.')
    if (!/^\d+(\.\d+)?$/.test(text)) return null
    const num = Number(text)
    return num >= MIN_FIXED_PRICE && num <= MAX_FIXED_PRICE ? num : null
}

export function getTrendArrow(currentCents, nextCents) {
    if (nextCents > currentCents) return '↑'
    if (nextCents < currentCents) return '↓'
    return '→'
}

export function formatCents(cents) {
    return cents.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatRate(rate) {
    return rate.toLocaleString('fi-FI', { maximumFractionDigits: 2 })
}

export function getTodayStr() {
    const fi = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }))
    return fi.getFullYear() + '-' +
        String(fi.getMonth() + 1).padStart(2, '0') + '-' +
        String(fi.getDate()).padStart(2, '0')
}

export function getTomorrowStr() {
    const fi = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }))
    fi.setDate(fi.getDate() + 1)
    return fi.getFullYear() + '-' +
        String(fi.getMonth() + 1).padStart(2, '0') + '-' +
        String(fi.getDate()).padStart(2, '0')
}

export function toHourly(data) {
    const groups = {}
    for (const p of data) {
        const key = p.DateTime.slice(0, 13) // group by "YYYY-MM-DDTHH"
        if (!groups[key]) groups[key] = []
        groups[key].push(p)
    }
    return Object.values(groups).map(chunk => ({
        DateTime: chunk[0].DateTime,
        PriceNoTax: chunk.reduce((s, p) => s + p.PriceNoTax, 0) / chunk.length,
    }))
}

export function getCurrentEntry(data, nowMs = Date.now()) {
    return data
        .filter(p => new Date(p.DateTime).getTime() <= nowMs)
        .sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime))[0]
}

// Render-safe clock: components read `now` from state instead of calling
// Date.now() directly during render (impure, breaks react-hooks/purity).
export function useNow(intervalMs = 30000) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(id)
    }, [intervalMs])
    return now
}

export function usePrices() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        async function load() {
            setError(null)
            try {
                const res = await fetch('https://api.spot-hinta.fi/TodayAndDayForward')
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                if (!Array.isArray(json)) throw new Error('Unexpected response format')
                const valid = json.filter(p => p && typeof p.DateTime === 'string' && typeof p.PriceNoTax === 'number' && isFinite(p.PriceNoTax))
                const sorted = valid.sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime))
                if (cancelled) return
                setData(sorted)
                setLastUpdated(new Date())
            } catch (e) {
                if (cancelled) return
                console.error('Hintojen lataus epäonnistui', e)
                setError('Hintojen lataus epäonnistui.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        const interval = setInterval(load, 15 * 60 * 1000)
        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [reloadKey])

    const retry = () => setReloadKey(key => key + 1)

    return { data, loading, error, lastUpdated, retry }
}
