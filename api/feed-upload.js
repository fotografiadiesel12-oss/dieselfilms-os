import { handleUpload } from "@vercel/blob/client";
import { requireSession } from "./_lib/session.js";

export default async function handler(req, res) {
  if (!requireSession(req, res)) return;

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
          "video/mp4", "video/quicktime", "video/webm",
        ],
        addRandomSuffix: true,
        // vídeo do celular pesa -- 500 MB cobre alguns minutos em 4K
        maximumSizeInBytes: 500 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
