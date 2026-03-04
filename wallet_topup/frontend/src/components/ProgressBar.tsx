type Props = {
    steps: string[];
    currentIndex: number;
};

export function ProgressBar({ steps, currentIndex }: Props) {
    return (
        <div className="progress-bar" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={steps.length}>
            {steps.map((_, i) => (
                <div
                    key={i}
                    className={`progress-segment ${i < currentIndex ? "completed" : ""} ${i === currentIndex ? "active" : ""}`}
                />
            ))}
        </div>
    );
}
