import type { FormState } from "../App";

type Props = {
  value: FormState["currency"];
  onChange: (v: FormState["currency"]) => void;
  onNext: () => void;
};

export function StepCurrency({ value, onChange, onNext }: Props) {
  return (
    <div className="step">
      <h1>Select currency</h1>
      <p className="muted">Choose how you want to top up</p>
      <div className="options">
        <button
          type="button"
          className={`option ${value === "UZS" ? "selected" : ""}`}
          onClick={() => onChange("UZS")}
        >
          UZS
        </button>
        <button
          type="button"
          className={`option ${value === "USDT" ? "selected" : ""}`}
          onClick={() => onChange("USDT")}
        >
          USDT
        </button>
      </div>
      <button type="button" className="btn primary full" onClick={onNext}>
        Next
      </button>
    </div>
  );
}
