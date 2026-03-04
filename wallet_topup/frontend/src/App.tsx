import { useEffect, useState, useCallback } from "react";
import { StepCurrency } from "./components/StepCurrency";
import { StepMethod } from "./components/StepMethod";
import { StepAmount } from "./components/StepAmount";
import { StepReceipt } from "./components/StepReceipt";
import { StepSubmit } from "./components/StepSubmit";
import { SuccessScreen } from "./components/SuccessScreen";
import { ProgressBar } from "./components/ProgressBar";
import { Toast } from "./components/Toast";
import type { PaymentMethod } from "./services/api";

export type Step = "currency" | "method" | "amount" | "receipt" | "submit" | "success";

const STEPS: Step[] = ["currency", "method", "amount", "receipt", "submit"];

export type FormState = {
  currency: "UZS" | "USDT";
  paymentMethod: PaymentMethod | null;
  amount: string;
  receiptFile: File | null;
  receiptPreview: string | null;
  submitting: boolean;
  error: string | null;
  transactionUid: string | null;
};

const initialForm: FormState = {
  currency: "UZS",
  paymentMethod: null,
  amount: "",
  receiptFile: null,
  receiptPreview: null,
  submitting: false,
  error: null,
  transactionUid: null,
};

export default function App() {
  const [step, setStep] = useState<Step>("currency");
  const [form, setForm] = useState<FormState>(initialForm);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    const twa = window.Telegram?.WebApp;
    if (twa) {
      twa.ready();
      twa.expand();
    }
  }, []);

  const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const haptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    } catch { }
  }, []);

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="app">
      {step !== "success" && (
        <ProgressBar steps={STEPS} currentIndex={currentStepIndex} />
      )}

      {step === "currency" && (
        <StepCurrency
          value={form.currency}
          onChange={(currency) => {
            haptic("light");
            setForm((f) => ({ ...f, currency, paymentMethod: null }));
          }}
          onNext={() => {
            haptic("medium");
            setStep("method");
          }}
        />
      )}

      {step === "method" && (
        <StepMethod
          currency={form.currency}
          selected={form.paymentMethod}
          onSelect={(paymentMethod) => {
            haptic("light");
            setForm((f) => ({ ...f, paymentMethod }));
          }}
          onBack={() => setStep("currency")}
          onNext={() => {
            haptic("medium");
            setStep("amount");
          }}
        />
      )}

      {step === "amount" && (
        <StepAmount
          currency={form.currency}
          value={form.amount}
          onChange={(amount) => setForm((f) => ({ ...f, amount }))}
          onBack={() => setStep("method")}
          onNext={() => {
            haptic("medium");
            setStep("receipt");
          }}
        />
      )}

      {step === "receipt" && (
        <StepReceipt
          file={form.receiptFile}
          preview={form.receiptPreview}
          onSelect={(file, preview) => {
            haptic("light");
            setForm((f) => ({ ...f, receiptFile: file, receiptPreview: preview }));
          }}
          onError={(msg) => showToast(msg, "error")}
          onBack={() => setStep("amount")}
          onNext={() => {
            haptic("medium");
            setStep("submit");
          }}
        />
      )}

      {step === "submit" && (
        <StepSubmit
          form={form}
          setForm={setForm}
          onSuccess={(transactionUid) => {
            haptic("heavy");
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
            setForm((f) => ({
              ...f,
              transactionUid,
              submitting: false,
              error: null,
            }));
            setStep("success");
          }}
          onError={(error) => {
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
            setForm((f) => ({ ...f, error, submitting: false }));
            showToast(error, "error");
          }}
          onBack={() => setStep("receipt")}
        />
      )}

      {step === "success" && form.transactionUid && (
        <SuccessScreen transactionUid={form.transactionUid} />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
