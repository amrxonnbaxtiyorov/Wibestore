import { useState } from "react";
import type { FormState } from "../App";

const MIN_UZS = 1_000;
const MIN_USDT = 1;

type Props = {
  currency: FormState["currency"];
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepAmount({ currency, value, onChange, onBack, onNext }: Props) {
  const [touched, setTouched] = useState(false);
  const num = value.trim() === "" ? NaN : Number(value);
  const min = currency === "UZS" ? MIN_UZS : MIN_USDT;
  const valid = !Number.isNaN(num) && num >= min && num > 0;

  return (
    <div className="step">
      <h1>Amount</h1>
      <p className="muted">
        Min: {currency === "UZS" ? `${MIN_UZS} UZS` : `${MIN_USDT} USDT`}
      </p>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={currency === "UZS" ? 1000 : 0.01}
        placeholder="0"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          onChange(v);
        }}
        onBlur={() => setTouched(true)}
        className="input full"
      />
      {touched && !valid && value.trim() !== "" && (
        <p className="error">Enter a valid amount (min {min})</p>
      )}
      <div className="row">
        <button type="button" className="btn secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onNext}
          disabled={!valid}
        >
          Next
        </button>
      </div>
    </div>
  );
}
