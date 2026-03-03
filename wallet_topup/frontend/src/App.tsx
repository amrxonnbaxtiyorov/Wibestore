import { useEffect, useState } from "react";
import { StepCurrency } from "./components/StepCurrency";
import { StepMethod } from "./components/StepMethod";
import { StepAmount } from "./components/StepAmount";
import { StepReceipt } from "./components/StepReceipt";
import { StepSubmit } from "./components/StepSubmit";
import { SuccessScreen } from "./components/SuccessScreen";
import type { PaymentMethod } from "./services/api";

export type Step = "currency" | "method" | "amount" | "receipt" | "submit" | "success";

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

  useEffect(() => {
    const twa = window.Telegram?.WebApp;
    if (twa) {
      twa.ready();
      twa.expand();
    }
  }, []);

  return (
    <div className="app">
      {step === "currency" && (
        <StepCurrency
          value={form.currency}
          onChange={(currency) => setForm((f) => ({ ...f, currency }))}
          onNext={() => setStep("method")}
        />
      )}
      {step === "method" && (
        <StepMethod
          currency={form.currency}
          selected={form.paymentMethod}
          onSelect={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))}
          onBack={() => setStep("currency")}
          onNext={() => setStep("amount")}
        />
      )}
      {step === "amount" && (
        <StepAmount
          currency={form.currency}
          value={form.amount}
          onChange={(amount) => setForm((f) => ({ ...f, amount }))}
          onBack={() => setStep("method")}
          onNext={() => setStep("receipt")}
        />
      )}
      {step === "receipt" && (
        <StepReceipt
          file={form.receiptFile}
          preview={form.receiptPreview}
          onSelect={(file, preview) =>
            setForm((f) => ({ ...f, receiptFile: file, receiptPreview: preview }))
          }
          onBack={() => setStep("amount")}
          onNext={() => setStep("submit")}
        />
      )}
      {step === "submit" && (
        <StepSubmit
          form={form}
          setForm={setForm}
          onSuccess={(transactionUid) => {
            setForm((f) => ({ ...f, transactionUid, submitting: false, error: null }));
            setStep("success");
          }}
          onError={(error) =>
            setForm((f) => ({ ...f, error, submitting: false }))
          }
          onBack={() => setStep("receipt")}
        />
      )}
      {step === "success" && form.transactionUid && (
        <SuccessScreen transactionUid={form.transactionUid} />
      )}
    </div>
  );
}
