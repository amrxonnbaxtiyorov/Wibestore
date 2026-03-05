import { submitTopUp } from "../services/api";
import type { FormState } from "../App";

type Props = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSuccess: (transactionUid: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
};

export function StepSubmit({ form, setForm, onSuccess, onError, onBack }: Props) {
  const handleSubmit = async () => {
    if (!form.paymentMethod || !form.receiptFile) return;
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      onError("Please open this app from Telegram.");
      return;
    }

    setForm((f) => ({ ...f, submitting: true, error: null }));
    try {
      const data = await submitTopUp(
        initData,
        form.currency,
        form.paymentMethod.code,
        amount,
        form.receiptFile
      );
      onSuccess(data.transaction_uid);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Submission failed");
    }
  };

  const amountNum = Number(form.amount);
  const formattedAmount = !Number.isNaN(amountNum)
    ? amountNum.toLocaleString()
    : form.amount;

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-label">Step 5 of 5</span>
        <h1>Review &amp; Submit</h1>
        <p className="subtitle">Check the details before submitting</p>
      </div>

      <div className="summary-card">
        <p className="summary-title">Payment Details</p>

        <div className="summary-row">
          <span className="label">Currency</span>
          <span className="value">{form.currency}</span>
        </div>
        <div className="summary-row">
          <span className="label">Method</span>
          <span className="value">{form.paymentMethod?.display_name}</span>
        </div>
        <div className="summary-row total">
          <span className="label">Amount</span>
          <span className="value">{formattedAmount} {form.currency}</span>
        </div>
        <div className="summary-row">
          <span className="label">Receipt</span>
          <span className="value">
            {form.receiptPreview ? (
              <img src={form.receiptPreview} alt="receipt" className="receipt-preview-small" />
            ) : (
              <span>📄 {form.receiptFile?.name}</span>
            )}
          </span>
        </div>
      </div>

      {form.error && <p className="error-text">⚠ {form.error}</p>}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={form.submitting}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={form.submitting}
        >
          {form.submitting ? (
            <><span className="spinner" /> Submitting…</>
          ) : (
            "Submit Payment"
          )}
        </button>
      </div>
    </div>
  );
}
