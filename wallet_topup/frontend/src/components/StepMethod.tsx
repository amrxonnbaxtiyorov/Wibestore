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
      <h1>Payment method</h1>
      <p className="muted">{currency === "UZS" ? "HUMO / UZCARD" : "VISA / MasterCard"}</p>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="options vertical">
          {methods.map((m) => (
            <button
              key={m.code}
              type="button"
              className={`option ${selected?.code === m.code ? "selected" : ""}`}
              onClick={() => onSelect(m)}
            >
              <span>{m.display_name}</span>
              {m.card_number && (
                <small className="card-number">{m.card_number}</small>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onNext}
          disabled={!selected}
        >
          Next
        </button>
      </div>
    </div>
  );
}
