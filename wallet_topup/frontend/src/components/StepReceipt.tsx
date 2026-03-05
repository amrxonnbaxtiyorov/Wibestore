import { useState } from "react";

const MAX_SIZE_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

type Props = {
  file: File | null;
  preview: string | null;
  onSelect: (file: File, preview: string | null) => void;
  onError: (msg: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepReceipt({ file, preview, onSelect, onError, onBack, onNext }: Props) {
  const [fileError, setFileError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      const msg = `File is too large. Maximum size is ${MAX_SIZE_MB} MB.`;
      setFileError(msg);
      onError(msg);
      e.target.value = "";
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(f.type)) {
      const msg = "Unsupported file type. Please upload JPG, PNG, WEBP or PDF.";
      setFileError(msg);
      onError(msg);
      e.target.value = "";
      return;
    }

    setFileError(null);
    let previewUrl: string | null = null;
    if (f.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(f);
    }
    onSelect(f, previewUrl);
  };

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-label">Step 4 of 5</span>
        <h1>Upload Receipt</h1>
        <p className="subtitle">Photo or PDF of your payment confirmation</p>
      </div>

      <label className={`upload-zone${file ? " has-file" : ""}`}>
        <input
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          className="hidden-input"
        />
        {file ? (
          <>
            {preview ? (
              <img src={preview} alt="Receipt preview" className="preview-image" />
            ) : (
              <div className="file-info">
                <span>📄</span>
                <span>{file.name}</span>
              </div>
            )}
            <span className="change-btn">Tap to change</span>
          </>
        ) : (
          <>
            <span className="upload-icon">📎</span>
            <span className="upload-text">Tap to select file</span>
            <span className="upload-hint">JPG, PNG, WEBP or PDF · max {MAX_SIZE_MB} MB</span>
          </>
        )}
      </label>

      {fileError && <p className="error-text">⚠ {fileError}</p>}

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={!file}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
