import { useEffect } from "react";

type Props = {
    message: string;
    type: "error" | "success";
    onClose: () => void;
};

export function Toast({ message, type, onClose }: Props) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="toast-container">
            <div className={`toast ${type}`} onClick={onClose} role="alert">
                <span>{type === "error" ? "⚠️" : "✅"}</span>
                <span>{message}</span>
            </div>
        </div>
    );
}
