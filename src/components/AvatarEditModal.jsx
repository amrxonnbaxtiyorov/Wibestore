import { useState, useEffect } from 'react';

export default function AvatarEditModal({ onClose, onSave }) {
    const [preview, setPreview] = useState(null);
    const [cropped, setCropped] = useState(null);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { setPreview(ev.target.result); setCropped(ev.target.result); };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (cropped && onSave) onSave(cropped);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div style={{ padding: '24px' }}>
                    <h2 style={{ marginBottom: '12px', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                        Profil suratini o'zgartirish
                    </h2>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: '16px' }} />
                    {preview && (
                        <div style={{ margin: '16px 0', textAlign: 'center' }}>
                            <img src={preview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2" style={{ marginTop: '16px' }}>
                        <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>Bekor qilish</button>
                        <button type="button" className="btn btn-primary btn-md" onClick={handleSave} disabled={!cropped}>Tasdiqlash</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
