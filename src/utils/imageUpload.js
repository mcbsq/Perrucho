// src/utils/imageUpload.js
// Convierte un File de imagen a un data URL redimensionado, listo para
// guardarse embebido en la base de datos (mismo patrón que el logo).

export function readImageAsResizedDataUrl(file, opts = {}) {
    const { maxDim = 480, type = 'image/png', maxSizeBytes = 4 * 1024 * 1024, quality } = opts;
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No se seleccionó ningún archivo.'));
        if (!file.type.startsWith('image/')) return reject(new Error('El archivo debe ser una imagen (PNG, JPG o WEBP).'));
        if (file.size > maxSizeBytes) return reject(new Error(`La imagen no debe pesar más de ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`));

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = maxDim / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(type, quality));
            };
            img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            img.src = ev.target.result;
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

// Igual que arriba pero regresa un Blob (JPEG) — para subir fotos del
// teléfono (5–12 MB) al almacenamiento ya reducidas, sin pasar por base64.
export function resizeImageToBlob(file, { maxDim = 1920, quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) return reject(new Error('El archivo debe ser una imagen.'));
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen (¿formato HEIC? Expórtala como JPG).')); };
        img.src = url;
    });
}
