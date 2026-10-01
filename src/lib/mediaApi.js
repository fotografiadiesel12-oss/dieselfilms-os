import { upload } from "@vercel/blob/client";
import { authHeaders } from "./authHeaders.js";

// Upload genérico de imagem (Vercel Blob) — usado pelo Feed e pela foto de perfil.
export async function uploadImagem(file) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/feed-upload",
    headers: authHeaders(),
  });
  return blob.url;
}

// Foto ou vídeo do Feed, com progresso (0-100). Arquivo grande (vídeo) sobe
// em partes, que é mais rápido e tenta de novo sozinho se uma parte falhar.
export async function uploadMidia(file, onProgress) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/feed-upload",
    headers: authHeaders(),
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(Math.round(percentage)) : undefined,
  });
  return blob.url;
}
