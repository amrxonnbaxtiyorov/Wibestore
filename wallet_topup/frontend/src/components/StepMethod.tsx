import { useEffect, useState } from "react";
import { getPaymentMethods } from "../services/api";
import type { PaymentMethod } from "../services/api";
import type { FormState } from "../App";

type Props = {
  currency: FormState["currency"];
  selected: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepMethod({ currency, selected, onSelect, onBack, onNext }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPaymentMethods(currency)
      .then((data) => {
        if (!cancelled) setMethods(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currency]);

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-label">Step 2 of 5</span>
        <h1>Payment Method</h1>
        <p className="subtitle">
          {currency === "UZS"
            ? "Local cards — HUMO / UZCARD"
            : "International cards — VISA / Mastercard"}
        </p>
      </div>

      {loading && (
        <div className="options-grid cols-1">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      )}

      {error && <p className="error-text">⚠ {error}</p>}

      {!loading && !error && (
        <div className="options-grid cols-1">
          {methods.map((m) => (
            <button
              key={m.code}
              type="button"
              className={`option-card ${selected?.code === m.code ? "selected" : ""}`}
              onClick={() => onSelect(m)}
            >
              <div className="check-icon">{selected?.code === m.code ? "✓" : ""}</div>
              <span className="option-label">{m.display_name}</span>
              {m.card_number && (
                <span className="option-sub">{m.card_number}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={!selected}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
