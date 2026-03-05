import { useEffect, useState } from "react";

type Props = { transactionUid: string };

const CONFETTI_COLORS = [
  "#6c5ce7", "#a29bfe", "#74b9ff", "#00cec9", "#fd79a8", "#fdcb6e", "#55efc4",
];

function Confetti() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    duration: `${1.5 + Math.random() * 1.5}s`,
    delay: `${Math.random() * 0.8}s`,
  }));

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            backgroundColor: p.color,
            ["--fall-duration" as string]: p.duration,
            ["--fall-delay" as string]: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export function SuccessScreen({ transactionUid }: Props) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="step success-screen">
        <div className="success-icon-wrapper">
          <span className="checkmark">✅</span>
        </div>

        <h1>Request Submitted!</h1>
        <p className="success-subtitle">
          Your top-up request is under review.{"\n"}
          You will be notified once it is approved or rejected.
        </p>

        <div className="transaction-id-card">
          <p className="label">Transaction ID</p>
          <code>{transactionUid}</code>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={() => window.Telegram?.WebApp?.close()}
        >
          Close
        </button>
      </div>
    </>
  );
}
