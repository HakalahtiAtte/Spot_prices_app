import { useState, useId } from 'react'
import { tocents, getTodayStr, getTomorrowStr, getPriceClass, formatCents } from '../hooks/usePrices'

function CompItem({ label, avg, fixedPrice }) {
    if (avg === null) {
        return (
            <div className="comp-item">
                <div className="comp-period">{label} ka.</div>
                <div className="comp-avg muted">Ei tietoja</div>
                <div className="comp-diff muted">Hintoja ei julkaistu vielä</div>
            </div>
        )
    }
    const diff = avg - fixedPrice
    const cheaper = diff < 0
    const priceClass = getPriceClass(avg, fixedPrice)
    return (
        <div className="comp-item">
            <div className="comp-period">{label} ka.</div>
            <div className={`comp-avg ${priceClass}`}>{formatCents(avg)} snt/kWh</div>
            <div className={`comp-diff ${priceClass}`}>
                {cheaper
                    ? `${formatCents(Math.abs(diff))} snt halvempi kuin kiinteä`
                    : `${formatCents(diff)} snt kalliimpi kuin kiinteä`}
            </div>
        </div>
    )
}

export default function Comparison({ data, fixedPrice }) {
    const [open, setOpen] = useState(true)
    const contentId = useId()
    const todayStr    = getTodayStr()
    const tomorrowStr = getTomorrowStr()

    const today          = data.filter(p => p.DateTime.slice(0, 10) === todayStr)
    const tomorrow       = data.filter(p => p.DateTime.slice(0, 10) === tomorrowStr)
    const todayAndTomorrow = data.filter(p =>
        p.DateTime.slice(0, 10) === todayStr ||
        p.DateTime.slice(0, 10) === tomorrowStr
    )

    const avg = arr => arr.length
        ? arr.reduce((s, p) => s + tocents(p.PriceNoTax), 0) / arr.length
        : null

    return (
        <div className="comparison">
            <h2 className="section-header">
                <button
                    type="button"
                    className="section-toggle"
                    aria-expanded={open}
                    aria-controls={contentId}
                    onClick={() => setOpen(o => !o)}
                >
                    <span className="section-title">Kiinteä hinta vs spot-keskiarvot</span>
                    <span className="collapse-btn" aria-hidden="true">{open ? '▲' : '▼'}</span>
                </button>
            </h2>
            {open && (
                <div className="comp-grid" id={contentId}>
                    <CompItem label="Tänään"            avg={avg(today)}           fixedPrice={fixedPrice} />
                    <CompItem label="Huomenna"         avg={avg(tomorrow)}         fixedPrice={fixedPrice} />
                    <CompItem label="Tänään & huomenna" avg={avg(todayAndTomorrow)} fixedPrice={fixedPrice} />
                </div>
            )}
        </div>
    )
}
