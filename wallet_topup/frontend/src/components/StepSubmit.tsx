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

  return (
    <div className="step">
      <h1>Confirm</h1>
      <div className="summary">
        <p><strong>Currency:</strong> {form.currency}</p>
        <p><strong>Method:</strong> {form.paymentMethod?.display_name}</p>
        <p><strong>Amount:</strong> {form.amount} {form.currency}</p>
      </div>
      {form.error && <p className="error">{form.error}</p>}
      <div className="row">
        <button
          type="button"
          className="btn secondary"
          onClick={onBack}
          disabled={form.submitting}
        >
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={handleSubmit}
          disabled={form.submitting}
        >
          {form.submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
