type Props = { transactionUid: string };

export function SuccessScreen({ transactionUid }: Props) {
  return (
    <div className="step success-screen">
      <div className="success-icon">✅</div>
      <h1>Submitted</h1>
      <p className="muted">
        Your top-up request has been sent. An admin will review it shortly.
      </p>
      <p className="transaction-id">
        ID: <code>{transactionUid}</code>
      </p>
      <button
        type="button"
        className="btn primary full"
        onClick={() => window.Telegram?.WebApp?.close()}
      >
        Close
      </button>
    </div>
  );
}
