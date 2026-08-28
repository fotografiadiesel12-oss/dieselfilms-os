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
