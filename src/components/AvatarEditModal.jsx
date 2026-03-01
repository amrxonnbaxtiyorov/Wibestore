import { useState } from 'react';
import Modal from './ConfirmDialog'; // Reuse modal if available

export default function AvatarEditModal({ open, onClose, onSave }) {
    // Removed unused image state
    // bu joyda preview va cropped image uchun state lar qo'shildi, real cropper bilan almashtirish mumkin
    const [preview, setPreview] = useState(null);
    const [cropped, setCropped] = useState(null);

    // Simple crop stub (replace with real cropper if needed)
    const handleCrop = () => {
        setCropped(preview);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (cropped) onSave(cropped);
    };

    if (!open) return null;
    return (
        <Modal isOpen={open} onClose={onClose}>
            <div style={{ padding: 24, minWidth: 320 }}>
                <h2 style={{ marginBottom: 12 }}>Profil suratini o'zgartirish</h2>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {preview && (
                    <div style={{ margin: '16px 0' }}>
                        <img src={preview} alt="Preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: '50%' }} />
                        <button type="button" onClick={handleCrop} style={{ marginLeft: 12 }}>Crop</button>
                    </div>
                )}
                {cropped && (
                    <div style={{ marginBottom: 12 }}>
                        <img src={cropped} alt="Cropped" style={{ maxWidth: 120, maxHeight: 120, borderRadius: '50%' }} />
                    </div>
                )}
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!cropped}>Tasdiqlash</button>
            </div>
        </Modal>
    );
}
