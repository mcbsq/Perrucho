// src/utils/photoUpload.js
//
// Sube una foto para una reseña (o cualquier flujo público) y regresa
// { url, w, h } con el tamaño ORIGINAL de la foto — la página la muestra en
// un formato fijo (recortada) y, al abrirla, completa con sus proporciones.
// Con Vercel Blob activo la foto va directo al almacenamiento; sin él, se
// guarda comprimida en línea.
import { uploadsApi } from '../api/apiClient';
import { readImageAsResizedDataUrl, resizeImageToBlob } from './imageUpload';

// { blob: bool, mode: 'presigned' | 'token' | null } — se pregunta una vez.
let blobStatus = null;
const getBlobStatus = () => {
    if (blobStatus === null) {
        blobStatus = uploadsApi.status().catch(() => ({ blob: false, mode: null }));
    }
    return blobStatus;
};
export const isBlobEnabled = async () => !!(await getBlobStatus()).blob;

// Sube un archivo directo del navegador a Vercel Blob. Con almacenamiento
// conectado por OIDC (lo que Vercel crea hoy) se usa URL prefirmada; con el
// token clásico, el flujo de siempre. payload: 'review' (público, solo
// fotos) o 'record' (expediente, requiere sesión del personal).
export const uploadToBlob = async (pathname, body, { payload = 'record', contentType } = {}) => {
    const { mode } = await getBlobStatus();
    const client = await import('@vercel/blob/client');
    const send = mode === 'presigned' ? client.uploadPresigned : client.upload;
    return send(pathname, body, {
        access: 'public',
        handleUploadUrl: uploadsApi.handleUploadUrl(),
        headers: uploadsApi.headers(),
        clientPayload: payload,
        ...(contentType ? { contentType } : {}),
    });
};

const naturalSize = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: null, h: null });
    img.src = src;
});

export const uploadPhoto = async (file, { payload = 'review', maxDim = 1920, inlineMaxDim = 1280 } = {}) => {
    if (!file?.type?.startsWith('image/')) throw new Error('Solo se pueden subir fotos (JPG, PNG o WEBP).');
    if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" pesa demasiado.`);
    if (await isBlobEnabled()) {
        const blob = await resizeImageToBlob(file, { maxDim, quality: 0.85 });
        const local = URL.createObjectURL(blob);
        const size = await naturalSize(local);
        URL.revokeObjectURL(local);
        const res = await uploadToBlob(`resenas/${Date.now()}.jpg`, blob, { payload, contentType: 'image/jpeg' });
        return { url: res.url, ...size };
    }
    const url = await readImageAsResizedDataUrl(file, { maxDim: inlineMaxDim, type: 'image/jpeg', quality: 0.78, maxSizeBytes: 25 * 1024 * 1024 });
    return { url, ...(await naturalSize(url)) };
};
