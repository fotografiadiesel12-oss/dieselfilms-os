import { handleUpload } from "@vercel/blob/client";
import { requireSession } from "./_lib/session.js";

export default async function handler(req, res) {
  if (!requireSession(req, res)) return;

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"],
        addRandomSuffix: true,
        maximumSizeInBytes: 8 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    res.status(200).json(jsonResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
