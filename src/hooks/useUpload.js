import { useMutation } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * Hook для загрузки изображений
 */
export const useUploadImage = () => {
    return useMutation({
        mutationFn: async (imageFile) => {
            const formData = new FormData();
            formData.append('image', imageFile);

            const { data } = await apiClient.post('/upload/image/', formData);
            return data;
        },
    });
};

/**
 * Hook для загрузки нескольких изображений
 */
export const useUploadImages = () => {
    return useMutation({
        mutationFn: async (imageFiles) => {
            const formData = new FormData();
            imageFiles.forEach((file) => {
                formData.append('images', file);
            });

            const { data } = await apiClient.post('/upload/images/', formData);
            return data;
        },
    });
};

export default { useUploadImage, useUploadImages };
