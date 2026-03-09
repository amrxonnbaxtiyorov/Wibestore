import { useState, useRef, useEffect } from 'react';

const CROP_SIZE = 400;
const PREVIEW_SIZE = 280;

/**
 * Rasm yuklanganda crop qilish modali. Markaziy kvadrat qirqadi.
 * onConfirm(blob) — qirqilgan rasm blob; onClose — bekor.
 */
export default function AvatarCropModal({ imageUrl, onConfirm, onClose }) {
    const [loaded, setLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
    const imgRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const onImageLoad = () => {
        if (imgRef.current) {
            const { naturalWidth: w, naturalHeight: h } = imgRef.current;
            setImageSize({ w, h });
            setLoaded(true);
        }
    };

    const getCroppedBlob = () => {
        if (!imgRef.current || !imageSize.w || !imageSize.h) return null;
        const img = imgRef.current;
        const { w, h } = imageSize;
        const size = Math.min(w, h);
        const sx = (w - size) / 2;
        const sy = (h - size) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = CROP_SIZE;
        canvas.height = CROP_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, CROP_SIZE, CROP_SIZE);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
        });
    };

    const handleCrop = async () => {
        const blob = await getCroppedBlob();
        if (blob) onConfirm(blob);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Rasmni qirqish">
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div style={{ padding: '24px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                        Rasmni qirqish
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                        Markaziy qism profil rasmi sifatida saqlanadi.
                    </p>
                    <div
                        style={{
                            position: 'relative',
                            width: PREVIEW_SIZE,
                            height: PREVIEW_SIZE,
                            margin: '0 auto 20px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: 'var(--color-bg-tertiary)',
                        }}
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt="Crop"
                            onLoad={onImageLoad}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                minWidth: '100%',
                                minHeight: '100%',
                                width: loaded ? (imageSize.w >= imageSize.h ? 'auto' : '100%') : '100%',
                                height: loaded ? (imageSize.h >= imageSize.w ? 'auto' : '100%') : '100%',
                                transform: 'translate(-50%, -50%)',
                                objectFit: 'cover',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
                            Bekor qilish
                        </button>
                        <button type="button" className="btn btn-primary btn-md" onClick={handleCrop} disabled={!loaded}>
                            Qirqish va davom etish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
