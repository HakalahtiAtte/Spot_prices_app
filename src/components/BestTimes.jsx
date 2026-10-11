import { useState, useId } from 'react'
import { tocents, getTodayStr, getTomorrowStr, getPriceClass, formatCents } from '../hooks/usePrices'

const DURATION_OPTIONS = [1, 2, 3, 6]
const DEFAULT_HOURS = 2
const MAX_WINDOWS = 4
const HOURS_STORAGE_KEY = 'bestTimesHours'
const DEFAULT_SLOT_MS = 15 * 60000

function fmtTime(ms) {
    return new Date(ms).toLocaleTimeString('fi-FI', {
        timeZone: 'Europe/Helsinki',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function helsinkiDateStr(ms) {
    return new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' })
}

function fmtWaitTime(ms) {
    const totalMinutes = Math.round(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} min`
    if (minutes === 0) return `${hours} h`
    return `${hours} h ${minutes} min`
}

function readStoredHours() {
    try {
        const stored = Number(localStorage.getItem(HOURS_STORAGE_KEY))
        return DURATION_OPTIONS.includes(stored) ? stored : DEFAULT_HOURS
    } catch {
        return DEFAULT_HOURS
    }
}

function storeHours(hours) {
    try {
        localStorage.setItem(HOURS_STORAGE_KEY, String(hours))
    } catch {
        // Storage can be unavailable (private mode); the choice then lasts for this visit only.
    }
}

function detectSlotMs(slots) {
    let smallest = Infinity
    for (let i = 1; i < slots.length; i++) {
        const gap = slots[i].startMs - slots[i - 1].startMs
        if (gap > 0 && gap < smallest) smallest = gap
    }
    return Number.isFinite(smallest) ? smallest : DEFAULT_SLOT_MS
}

// Cheapest continuous windows that have not yet ended, never spanning a gap in the data,
// ranked by average price and kept non-overlapping so the list offers real alternatives.
function findCheapestWindows(data, nowMs, hours, maxWindows = MAX_WINDOWS) {
    const allSlots = data.map(p => ({ startMs: new Date(p.DateTime).getTime(), price: p.PriceNoTax }))
    const slotMs = detectSlotMs(allSlots)
    const slots = allSlots.filter(s => s.startMs + slotMs > nowMs)
    const slotsNeeded = Math.round((hours * 3600000) / slotMs)

    const candidates = []
    for (let i = 0; i + slotsNeeded <= slots.length; i++) {
        let sum = 0
        let continuous = true
        for (let j = i; j < i + slotsNeeded; j++) {
            if (j > i && slots[j].startMs - slots[j - 1].startMs !== slotMs) {
                continuous = false
                break
            }
            sum += slots[j].price
        }
        if (!continuous) continue
        candidates.push({
            startMs: slots[i].startMs,
            endMs: slots[i + slotsNeeded - 1].startMs + slotMs,
            avgPrice: sum / slotsNeeded,
        })
    }

    candidates.sort((a, b) => a.avgPrice - b.avgPrice || a.startMs - b.startMs)

    const picked = []
    for (const candidate of candidates) {
        const overlaps = picked.some(p => candidate.startMs < p.endMs && p.startMs < candidate.endMs)
        if (!overlaps) picked.push(candidate)
        if (picked.length === maxWindows) break
    }
    return picked
}

export default function BestTimes({ data, fixedPrice, nowMs }) {
    const [hours, setHours] = useState(readStoredHours)
    const [open, setOpen] = useState(true)
    const contentId = useId()

    const todayStr = getTodayStr()
    const tomorrowStr = getTomorrowStr()
    const hasTomorrow = data.some(p => p.DateTime.slice(0, 10) === tomorrowStr)
    const windows = findCheapestWindows(data, nowMs, hours)
    const best = windows[0]

    function selectHours(value) {
        setHours(value)
        storeHours(value)
    }

    function dayLabel(ms) {
        const day = helsinkiDateStr(ms)
        if (day === todayStr) return 'tänään'
        if (day === tomorrowStr) return 'huomenna'
        return new Date(ms).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'long' })
    }

    return (
        <div className="best-times">
            <div className="best-times-header">
                <h2 className="section-header">
                    <button
                        type="button"
                        className="section-toggle"
                        aria-expanded={open}
                        aria-controls={contentId}
                        onClick={() => setOpen(o => !o)}
                    >
                        <span className="section-title">Halvimmat ajat</span>
                        <span className="collapse-btn" aria-hidden="true">{open ? '▲' : '▼'}</span>
                    </button>
                </h2>

                {open && (
                    <div className="toggle-group" role="group" aria-label="Laitteen käyntiaika">
                        {DURATION_OPTIONS.map(value => (
                            <button
                                key={value}
                                type="button"
                                className={hours === value ? 'toggle-btn active' : 'toggle-btn'}
                                aria-pressed={hours === value}
                                onClick={() => selectHours(value)}
                            >
                                {value} h
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {open && (
                <div id={contentId}>
                    {best ? (
                        <p className="best-summary">
                            {best.startMs <= nowMs
                                ? <>Halvin {hours} h jakso on <strong>käynnissä nyt</strong> ja kestää klo {fmtTime(best.endMs)} asti.</>
                                : <>Halvin {hours} h jakso alkaa <strong>{fmtWaitTime(best.startMs - nowMs)} kuluttua</strong>.</>}
                        </p>
                    ) : (
                        <p className="best-summary">
                            Jäljellä olevista hinnoista ei löydy yhtenäistä {hours} tunnin jaksoa.
                        </p>
                    )}

                    {windows.map(option => {
                        const cents = tocents(option.avgPrice)
                        const startLabel = option.startMs <= nowMs
                            ? 'nyt'
                            : `${dayLabel(option.startMs)} ${fmtTime(option.startMs)}`
                        return (
                            <div key={option.startMs} className="time-slot">
                                <div className="time-slot-left">
                                    <span className="time-range">
                                        {startLabel} – {fmtTime(option.endMs)}
                                    </span>
                                    {cents < fixedPrice && (
                                        <span className="below-fixed">
                                            {formatCents(fixedPrice - cents)} snt alle kiinteän
                                        </span>
                                    )}
                                </div>
                                <span className={`slot-price ${getPriceClass(cents, fixedPrice)}`}>
                                    ka. {formatCents(cents)} snt/kWh
                                </span>
                            </div>
                        )
                    })}

                    {!hasTomorrow && (
                        <p className="best-note">
                            Huomisen hinnat julkaistaan noin klo 14.15, jolloin halvempi aika voi löytyä.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
