import type { FormState } from "../App";

const MAX_SIZE_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

type Props = {
  file: File | null;
  preview: string | null;
  onSelect: (file: File, preview: string | null) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepReceipt({ file, preview, onSelect, onBack, onNext }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return; // UI could show error
    }
    let previewUrl: string | null = null;
    if (f.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(f);
    }
    onSelect(f, previewUrl);
  };

  return (
    <div className="step">
      <h1>Payment receipt</h1>
      <p className="muted">Upload image or PDF (max {MAX_SIZE_MB} MB)</p>
      <label className="upload-zone">
        <input
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          className="hidden"
        />
        {file ? (
          <div className="preview">
            {preview ? (
              <img src={preview} alt="Receipt" />
            ) : (
              <span>📄 {file.name}</span>
            )}
          </div>
        ) : (
          <span className="upload-placeholder">Tap to select file</span>
        )}
      </label>
      <div className="row">
        <button type="button" className="btn secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onNext}
          disabled={!file}
        >
          Next
        </button>
      </div>
    </div>
  );
}
