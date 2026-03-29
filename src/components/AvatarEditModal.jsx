import { useState, useEffect } from 'react';
import { useUploadImage, useUpdateProfile } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

export default function AvatarEditModal({ onClose }) {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const { addToast } = useToast();
    const { refreshUser } = useAuth();
    const { mutate: uploadImage, isPending: isUploading } = useUploadImage();
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();

    const isPending = isUploading || isUpdating;

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target.result);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSave = () => {
        if (!file) return;

        uploadImage(file, {
            onSuccess: (data) => {
                let imageUrl = data?.url || data?.image?.url;
                if (!imageUrl) {
                    addToast({
                        type: 'error',
                        title: 'Xatolik',
                        message: "Rasm yuklandi, lekin URL olinmadi. Profil yangilanmadi.",
                    });
                    return;
                }
                if (typeof imageUrl === 'string' && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
                    imageUrl = window.location.origin + imageUrl;
                }
                updateProfile(
                    { avatar_url: imageUrl },
                    {
                        onSuccess: async () => {
                            try {
                                await refreshUser();
                            } catch {
                                // Profile updated; refresh may use different endpoint
                            }
                            addToast({
                                type: 'success',
                                title: 'Muvaffaqiyatli',
                                message: "Rasm muvaffaqiyatli o'zgartirildi",
                            });
                            onClose();
                        },
                        onError: (error) => {
                            const msg = error?.response?.data?.error?.message
                                || error?.response?.data?.detail
                                || (typeof error?.response?.data?.error === 'string' ? error.response.data.error : null)
                                || error?.message
                                || "Profil yangilanmadi.";
                            addToast({
                                type: 'error',
                                title: 'Xatolik',
                                message: msg,
                            });
                        },
                    }
                );
            },
            onError: (error) => {
                const msg = error?.response?.data?.error?.message
                    || error?.response?.data?.detail
                    || (typeof error?.response?.data?.error === 'string' ? error.response.data.error : null)
                    || error?.message
                    || "Rasm yuklanmadi. Qayta urinib ko'ring.";
                addToast({
                    type: 'error',
                    title: 'Xatolik',
                    message: msg,
                });
            },
        });
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
                        <button type="button" className="btn btn-secondary btn-md" onClick={onClose} disabled={isPending}>
                            Bekor qilish
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-md"
                            onClick={handleSave}
                            disabled={!file || isPending}
                        >
                            {isPending ? "Yuklanmoqda..." : "Tasdiqlash"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
