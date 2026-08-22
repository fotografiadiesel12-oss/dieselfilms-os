import { upload } from "@vercel/blob/client";

// Upload genérico de imagem (Vercel Blob) — usado pelo Feed e pela foto de perfil.
export async function uploadImagem(file) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/feed-upload",
  });
  return blob.url;
}
