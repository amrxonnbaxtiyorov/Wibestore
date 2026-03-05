import type { FormState } from "../App";

type Props = {
  value: FormState["currency"];
  walletBalance: string | null;
  onChange: (v: FormState["currency"]) => void;
  onNext: () => void;
};

export function StepCurrency({ value, walletBalance, onChange, onNext }: Props) {
  return (
    <div className="step">
      <div className="step-header">
        <span className="step-label">Step 1 of 5</span>
        <h1>Select Currency</h1>
        <p className="subtitle">Choose how you want to top up</p>
      </div>

      {walletBalance !== null && (
        <div className="balance-card">
          <span className="balance-label">Current Balance</span>
          <span className="balance-amount">{Number(walletBalance).toLocaleString()} UZS</span>
        </div>
      )}

      <div className="options-grid cols-2">
        {(["UZS", "USDT"] as const).map((cur) => (
          <button
            key={cur}
            type="button"
            className={`option-card ${value === cur ? "selected" : ""}`}
            onClick={() => onChange(cur)}
          >
            <div className="check-icon">{value === cur ? "✓" : ""}</div>
            <span className="option-icon">{cur === "UZS" ? "🇺🇿" : "₮"}</span>
            <span className="option-label">{cur}</span>
            <span className="option-sub">
              {cur === "UZS" ? "Uzbek Sum" : "Tether USD"}
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-full" onClick={onNext}>
        Continue →
      </button>
    </div>
  );
}
