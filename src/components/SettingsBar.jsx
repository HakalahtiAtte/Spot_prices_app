import { useState } from 'react'
import { parseFixedPrice, formatRate } from '../hooks/usePrices'

export default function SettingsBar({ fixedPrice, onChange }) {
    const [raw, setRaw] = useState(formatRate(fixedPrice))
    const isValid = parseFixedPrice(raw) !== null

    function handleChange(e) {
        setRaw(e.target.value)
        const num = parseFixedPrice(e.target.value)
        if (num !== null) onChange(num)
    }

    function handleBlur() {
        if (!isValid) setRaw(formatRate(fixedPrice))
    }

    return (
        <div className="settings-bar">
            <label htmlFor="fixed-input">Kiinteä sopimushintasi</label>
            <div className="settings-input-group">
                <input
                    id="fixed-input"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={raw}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!isValid}
                    aria-describedby={isValid ? undefined : 'fixed-input-error'}
                />
                <span className="unit-label">snt/kWh</span>
            </div>
            {!isValid && (
                <p id="fixed-input-error" className="settings-error">
                    Anna hinta väliltä 0,01–100 snt/kWh. Vertailu käyttää edellistä hintaa {formatRate(fixedPrice)} snt.
                </p>
            )}
        </div>
    )
}
