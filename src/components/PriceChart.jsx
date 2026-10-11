import { useState, useMemo, useRef, useEffect } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    LineController,
    PointElement,
    Tooltip,
    Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { tocents, getTodayStr, getTomorrowStr, toHourly, getPriceClass, formatCents, formatRate } from '../hooks/usePrices'

// Custom plugin: labelled vertical "now" marker
const nowLinePlugin = {
    id: 'nowLine',
    afterDatasetsDraw(chart) {
        const { index, color } = chart.options.plugins?.nowLine ?? {}
        if (index == null || index < 0) return
        const bar = chart.getDatasetMeta(0).data[index]
        if (!bar) return
        const { ctx, chartArea } = chart
        ctx.save()
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.globalAlpha = 0.75
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(bar.x, chartArea.top + 14)
        ctx.lineTo(bar.x, chartArea.bottom)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.font = '600 11px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Nyt', bar.x, chartArea.top + 10)
        ctx.restore()
    },
}

ChartJS.register(
    CategoryScale, LinearScale,
    BarElement, BarController,
    LineElement, LineController,
    PointElement, Tooltip, Legend, nowLinePlugin
)

// Canvas drawing can't use CSS variables directly, so the theme's tokens are read once per theme.
function readChartColors() {
    const styles = getComputedStyle(document.documentElement)
    const token = name => styles.getPropertyValue(name).trim()
    return {
        cheap: token('--cheap'),
        moderate: token('--moderate'),
        expensive: token('--expensive'),
        tick: token('--muted'),
        gridX: token('--surface2'),
        gridY: token('--border'),
        now: token('--text'),
    }
}

function fmtTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('fi-FI', {
        timeZone: 'Europe/Helsinki',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const MIN_BAR_WIDTH = { '15min': 14, '1hour': 36 }
const VIEW_OPTIONS = [['today', 'Tänään'], ['tomorrow', 'Huomenna'], ['both', 'Molemmat']]
const INTERVAL_OPTIONS = [['15min', '15 min'], ['1hour', '1 tunti']]

export default function PriceChart({ data, fixedPrice, theme, nowMs }) {
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tokens change when the theme does
    const c = useMemo(() => readChartColors(), [theme])
    const [showFixed, setShowFixed] = useState(false)
    const [view, setView] = useState('today')
    const [intervalMode, setIntervalMode] = useState('15min')
    const [containerWidth, setContainerWidth] = useState(800)
    const scrollRef = useRef(null)
    const containerRef = useRef(null)

    const todayStr = getTodayStr()
    const tomorrowStr = getTomorrowStr()

    // Track container width with ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            setContainerWidth(entries[0].contentRect.width)
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // Mouse drag to scroll
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        let isDown = false
        let startX = 0
        let scrollLeft = 0

        const onMouseDown = e => {
            isDown = true
            startX = e.pageX - el.offsetLeft
            scrollLeft = el.scrollLeft
            el.style.cursor = 'grabbing'
        }
        const onMouseUp = () => {
            isDown = false
            el.style.cursor = 'grab'
        }
        const onMouseMove = e => {
            if (!isDown) return
            e.preventDefault()
            const x = e.pageX - el.offsetLeft
            el.scrollLeft = scrollLeft - (x - startX)
        }

        el.addEventListener('mousedown', onMouseDown)
        el.addEventListener('mouseup', onMouseUp)
        el.addEventListener('mouseleave', onMouseUp)
        el.addEventListener('mousemove', onMouseMove)
        return () => {
            el.removeEventListener('mousedown', onMouseDown)
            el.removeEventListener('mouseup', onMouseUp)
            el.removeEventListener('mouseleave', onMouseUp)
            el.removeEventListener('mousemove', onMouseMove)
        }
    }, [])

    const filtered = useMemo(() => {
        if (view === 'today') return data.filter(p => p.DateTime.slice(0, 10) === todayStr)
        if (view === 'tomorrow') return data.filter(p => p.DateTime.slice(0, 10) === tomorrowStr)
        return data.filter(p =>
            p.DateTime.slice(0, 10) === todayStr ||
            p.DateTime.slice(0, 10) === tomorrowStr
        )
    }, [data, view, todayStr, tomorrowStr])

    const chartData = useMemo(() =>
        intervalMode === '1hour' ? toHourly(filtered) : filtered,
        [filtered, intervalMode]
    )

    // Index of current interval bar
    const currentIndex = useMemo(() => {
        if (view === 'tomorrow') return -1
        let idx = -1
        for (let i = 0; i < chartData.length; i++) {
            if (new Date(chartData[i].DateTime).getTime() <= nowMs) idx = i
            else break
        }
        return idx
    }, [chartData, view, nowMs])

    // Scroll to current time on load
    useEffect(() => {
        if (!scrollRef.current || view !== 'today') return
        const nowHelsinki = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }))
        const progress = (nowHelsinki.getHours() * 60 + nowHelsinki.getMinutes()) / (24 * 60)
        const totalWidth = chartData.length * MIN_BAR_WIDTH[intervalMode]
        const scrollTo = totalWidth * progress - containerWidth / 2
        scrollRef.current.scrollLeft = Math.max(0, scrollTo)
    }, [chartData, intervalMode, view, containerWidth])

    const prices = chartData.map(p => tocents(p.PriceNoTax))
    const colors = prices.map(p => c[getPriceClass(p, fixedPrice)])

    const dayPrefix = p => view === 'both'
        ? (p.DateTime.slice(0, 10) === todayStr ? 'T ' : 'H ')
        : ''
    const labels = chartData.map(p => dayPrefix(p) + fmtTime(p.DateTime))

    const chartWidth = Math.max(chartData.length * MIN_BAR_WIDTH[intervalMode], containerWidth)

    const intervalLabel = intervalMode === '1hour' ? 'tunnittain' : '15 min'
    const dayLabel = view === 'today' ? 'Tänään' : view === 'tomorrow' ? 'Huomenna' : 'Tänään & huomenna'

    let summary = ''
    if (prices.length) {
        const minIndex = prices.indexOf(Math.min(...prices))
        const maxIndex = prices.indexOf(Math.max(...prices))
        summary = ` Halvin klo ${labels[minIndex]}, ${formatCents(prices[minIndex])} snt.` +
            ` Kallein klo ${labels[maxIndex]}, ${formatCents(prices[maxIndex])} snt.`
    }
    const chartLabel = `Hintakaavio, ${dayLabel.toLowerCase()}, ${intervalLabel}.${summary}`

    const chartConfig = {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'Hinta (snt/kWh)',
                data: prices,
                backgroundColor: colors,
                borderRadius: 2,
                barPercentage: 0.85,
            },
            {
                type: 'line',
                label: `Kiinteä (${formatRate(fixedPrice)} snt)`,
                data: Array(chartData.length).fill(fixedPrice),
                borderColor: c.moderate,
                borderDash: [6, 3],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                hidden: !showFixed,
            }
        ]
    }

    const options = {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            nowLine: { index: currentIndex, color: c.now },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => {
                        if (ctx.datasetIndex === 0) {
                            const diff = ctx.raw - fixedPrice
                            const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
                            return `${formatCents(ctx.raw)} snt (${sign}${formatCents(Math.abs(diff))} snt vs kiinteä)`
                        }
                        return `Kiinteä: ${formatRate(ctx.raw)} snt`
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: c.tick,
                    maxRotation: 60,
                    font: { size: 11 },
                    autoSkip: true,
                    maxTicksLimit: intervalMode === '15min' ? 24 : 12,
                },
                grid: { color: c.gridX }
            },
            y: {
                ticks: { color: c.tick, callback: v => `${formatRate(v)} snt`, font: { size: 12 } },
                grid: { color: c.gridY }
            }
        }
    }

    return (
        <div className="chart-container" ref={containerRef}>
            <div className="chart-header">
                <h2 className="section-title">{dayLabel} — {intervalLabel}</h2>
                <div className="chart-controls">
                    <div className="toggle-group" role="group" aria-label="Näytettävä päivä">
                        {VIEW_OPTIONS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={view === value ? 'toggle-btn active' : 'toggle-btn'}
                                aria-pressed={view === value}
                                onClick={() => setView(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="toggle-group" role="group" aria-label="Kaavion tarkkuus ja vertailuviiva">
                        {INTERVAL_OPTIONS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={intervalMode === value ? 'toggle-btn active' : 'toggle-btn'}
                                aria-pressed={intervalMode === value}
                                onClick={() => setIntervalMode(value)}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={showFixed ? 'toggle-btn active' : 'toggle-btn'}
                            aria-pressed={showFixed}
                            onClick={() => setShowFixed(f => !f)}
                        >
                            Kiinteä {formatRate(fixedPrice)} snt
                        </button>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="chart-scroll-wrapper"
                tabIndex={0}
                role="region"
                aria-label="Hintakaavio, vieritä nuolinäppäimillä"
            >
                {chartData.length === 0 && view === 'tomorrow' ? (
                    <div className="chart-empty" role="status">
                        Huomisen hinnat julkaistaan yleensä noin klo 14.15.
                    </div>
                ) : (
                    <div style={{ width: chartWidth, height: 280 }}>
                        <Chart
                            key={`${view}-${intervalMode}`}
                            type="bar"
                            data={chartConfig}
                            options={options}
                            width={chartWidth}
                            height={280}
                            aria-label={chartLabel}
                            role="img"
                        />
                    </div>
                )}
            </div>

            {chartData.length > 0 && (
                <table className="visually-hidden">
                    <caption>Hinnat, {dayLabel.toLowerCase()}, {intervalLabel}</caption>
                    <thead>
                        <tr><th scope="col">Aika</th><th scope="col">Hinta snt/kWh</th></tr>
                    </thead>
                    <tbody>
                        {chartData.map((p, i) => (
                            <tr key={p.DateTime}>
                                <th scope="row">{labels[i]}{i === currentIndex ? ' (nyt)' : ''}</th>
                                <td>{formatCents(prices[i])}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div className="chart-legend">
                <span><span className="legend-dot" style={{ background: c.cheap }} aria-hidden="true" />Halpa: alle kiinteän</span>
                <span><span className="legend-dot" style={{ background: c.moderate }} aria-hidden="true" />Kohtalainen: enintään +40 %</span>
                <span><span className="legend-dot" style={{ background: c.expensive }} aria-hidden="true" />Kallis: yli +40 %</span>
                {view !== 'tomorrow' && <span>Katkoviiva = nyt</span>}
            </div>
        </div>
    )
}
