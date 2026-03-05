import { useState } from "react";
import type { FormState } from "../App";

const LIMITS = {
  UZS:  { min: 10_000,  max: 50_000_000, step: 10_000 },
  USDT: { min: 1,       max: 10_000,     step: 1 },
};

const UZS_PRESETS  = [50_000, 100_000, 500_000, 1_000_000];
const USDT_PRESETS = [10, 50, 100, 500];

function formatPreset(n: number, currency: "UZS" | "USDT"): string {
  if (currency === "UZS") {
    return n >= 1_000_000 ? `${n / 1_000_000}M` : `${(n / 1_000).toFixed(0)}K`;
  }
  return String(n);
}

type Props = {
  currency: FormState["currency"];
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepAmount({ currency, value, onChange, onBack, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const { min, max, step } = LIMITS[currency];
  const num = value.trim() === "" ? NaN : Number(value);
  const valid = !Number.isNaN(num) && num >= min && num <= max;

  const errorMsg =
    touched && value.trim() !== "" && !valid
      ? num > max
        ? `Maximum: ${max.toLocaleString()} ${currency}`
        : `Minimum: ${min.toLocaleString()} ${currency}`
      : null;

  const presets = currency === "UZS" ? UZS_PRESETS : USDT_PRESETS;

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-label">Step 3 of 5</span>
        <h1>Enter Amount</h1>
        <p className="subtitle">
          Min: {min.toLocaleString()} {currency} · Max: {max.toLocaleString()} {currency}
        </p>
      </div>

      <div className="amount-input-container">
        <div className="input-wrapper">
          <label htmlFor="amount-input">Amount</label>
          <input
            id="amount-input"
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            placeholder={min.toLocaleString()}
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              onChange(v);
            }}
            onBlur={() => setTouched(true)}
            className={`input-field${errorMsg ? " error" : ""}`}
          />
          <span className="input-suffix">{currency}</span>
        </div>
      </div>

      {errorMsg && <p className="error-text">⚠ {errorMsg}</p>}

      <div className="amount-presets">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="preset-chip"
            onClick={() => {
              onChange(String(preset));
              setTouched(true);
            }}
          >
            {formatPreset(preset, currency)} {currency}
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { setTouched(true); if (valid) onNext(); }}
          disabled={!valid}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
