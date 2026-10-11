import { tocents, getTodayStr, getTomorrowStr, getCurrentEntry, getPriceClass, getTrendArrow, formatCents, vatLabel } from '../hooks/usePrices'

function fmtTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('fi-FI', {
        timeZone: 'Europe/Helsinki',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const BADGE_CLASS = { cheap: 'saving', moderate: 'over', expensive: 'losing' }

function ContractBadge({ cents, fixedPrice, prefix = '' }) {
    const diff = cents - fixedPrice
    return (
        <div className={`badge ${BADGE_CLASS[getPriceClass(cents, fixedPrice)]}`}>
            {diff < 0
                ? `${prefix}${formatCents(Math.abs(diff))} snt alle kiinteän`
                : `${prefix}${formatCents(diff)} snt yli kiinteän`}
        </div>
    )
}

function minEntry(entries) {
    return entries.reduce((m, p) => p.PriceNoTax < m.PriceNoTax ? p : m)
}

function maxEntry(entries) {
    return entries.reduce((m, p) => p.PriceNoTax > m.PriceNoTax ? p : m)
}

export default function SummaryCards({ data, fixedPrice, nowMs, children }) {
    const todayStr = getTodayStr()
    const tomorrowStr = getTomorrowStr()

    const today = data.filter(p => p.DateTime.slice(0, 10) === todayStr)
    const tomorrow = data.filter(p => p.DateTime.slice(0, 10) === tomorrowStr)

    const todayCents = today.map(p => tocents(p.PriceNoTax))
    const current = getCurrentEntry(data, nowMs)
    const currentCents = current ? tocents(current.PriceNoTax) : null

    const nextEntry = data.find(p => new Date(p.DateTime).getTime() > nowMs)
    const nextCents = nextEntry ? tocents(nextEntry.PriceNoTax) : null

    const avg = todayCents.length
        ? todayCents.reduce((a, b) => a + b, 0) / todayCents.length
        : null
    const cheaperCount = todayCents.filter(c => c < fixedPrice).length

    const todayLow  = today.length ? minEntry(today) : null
    const todayHigh = today.length ? maxEntry(today) : null
    const tmrLow    = tomorrow.length ? minEntry(tomorrow) : null
    const tmrHigh   = tomorrow.length ? maxEntry(tomorrow) : null

    const heroClass = currentCents !== null ? getPriceClass(currentCents, fixedPrice) : ''

    return (
        <>
            <div className={`current-price-hero ${heroClass}`}>
                <div className="current-price-label">Nykyinen hinta</div>
                {currentCents !== null ? (
                    <>
                        <div className="current-price-row">
                            <div className="current-price-value">
                                {formatCents(currentCents)}
                                <span className="current-price-unit">snt/kWh</span>
                            </div>
                            {nextCents !== null && (
                                <div className={`price-trend ${getPriceClass(nextCents, fixedPrice)}`}>
                                    <span className="trend-arrow" aria-hidden="true">{getTrendArrow(currentCents, nextCents)}</span>
                                    <span className="trend-label">
                                        <span className="visually-hidden">Seuraava jakso </span>
                                        <span aria-hidden="true">Seur. </span>{formatCents(nextCents)} snt
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="current-price-sub">{currentCents < 0 ? 'Negatiivinen hinta, ei ALV:tä' : 'sis. ALV 25,5 %'}</div>
                        <ContractBadge cents={currentCents} fixedPrice={fixedPrice} />
                    </>
                ) : (
                    <div className="current-price-value">—</div>
                )}
            </div>

            {children}

            <div className="cards">
                <div className="card">
                    <div className="card-label">Tänään keskiarvo</div>
                    {avg !== null ? (
                        <>
                            <div className={`card-value ${getPriceClass(avg, fixedPrice)}`}>{formatCents(avg)}</div>
                            <div className="card-unit">snt/kWh sis. ALV</div>
                            <ContractBadge cents={avg} fixedPrice={fixedPrice} prefix="ka. " />
                        </>
                    ) : (
                        <div className="card-value">—</div>
                    )}
                </div>

                <div className="card">
                    <div className="card-label">Tänään alin</div>
                    {todayLow ? (
                        <>
                            <div className={`card-value ${getPriceClass(tocents(todayLow.PriceNoTax), fixedPrice)}`}>{formatCents(tocents(todayLow.PriceNoTax))}</div>
                            <div className="card-unit">snt/kWh {vatLabel(tocents(todayLow.PriceNoTax))}</div>
                            <div className="card-time">klo {fmtTime(todayLow.DateTime)}</div>
                        </>
                    ) : (
                        <div className="card-value">—</div>
                    )}
                </div>

                <div className="card">
                    <div className="card-label">Tänään korkein</div>
                    {todayHigh ? (
                        <>
                            <div className={`card-value ${getPriceClass(tocents(todayHigh.PriceNoTax), fixedPrice)}`}>{formatCents(tocents(todayHigh.PriceNoTax))}</div>
                            <div className="card-unit">snt/kWh {vatLabel(tocents(todayHigh.PriceNoTax))}</div>
                            <div className="card-time">klo {fmtTime(todayHigh.DateTime)}</div>
                        </>
                    ) : (
                        <div className="card-value">—</div>
                    )}
                </div>

                <div className="card">
                    <div className="card-label">Alle kiinteän hinnan</div>
                    <div className="card-value">
                        {todayCents.length ? `${cheaperCount} / ${todayCents.length}` : '—'}
                    </div>
                    <div className="card-unit">jaksoa tänään</div>
                </div>

                <div className="card">
                    <div className="card-label">Huomenna alin</div>
                    {tmrLow ? (
                        <>
                            <div className={`card-value ${getPriceClass(tocents(tmrLow.PriceNoTax), fixedPrice)}`}>{formatCents(tocents(tmrLow.PriceNoTax))}</div>
                            <div className="card-unit">snt/kWh {vatLabel(tocents(tmrLow.PriceNoTax))}</div>
                            <div className="card-time">klo {fmtTime(tmrLow.DateTime)}</div>
                        </>
                    ) : (
                        <>
                            <div className="card-value muted">—</div>
                            <div className="card-time muted">Julkaistaan noin klo 14.15</div>
                        </>
                    )}
                </div>

                <div className="card">
                    <div className="card-label">Huomenna korkein</div>
                    {tmrHigh ? (
                        <>
                            <div className={`card-value ${getPriceClass(tocents(tmrHigh.PriceNoTax), fixedPrice)}`}>{formatCents(tocents(tmrHigh.PriceNoTax))}</div>
                            <div className="card-unit">snt/kWh {vatLabel(tocents(tmrHigh.PriceNoTax))}</div>
                            <div className="card-time">klo {fmtTime(tmrHigh.DateTime)}</div>
                        </>
                    ) : (
                        <>
                            <div className="card-value muted">—</div>
                            <div className="card-time muted">Julkaistaan noin klo 14.15</div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
