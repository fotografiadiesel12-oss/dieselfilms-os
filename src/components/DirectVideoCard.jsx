import React from "react";

function toEmbedUrl(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    }
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (url.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${url.pathname.split("/")[2]}`;
    }
    if (url.hostname.includes("drive.google.com")) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  } catch {
    return null;
  }
  return null;
}

/* Link direto de vídeo (Drive/YouTube/mp4). Usa iframe de embed quando dá
   pra reconhecer a URL, senão cai para um <video> nativo com o link cru. */
export default function DirectVideoCard({ link, titulo }) {
  const embedUrl = toEmbedUrl(link);

  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#000" }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={titulo || "vídeo"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <video src={link} controls style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        )}
      </div>
      {titulo && <div style={{ fontSize: 12, marginTop: 6, color: "#A69F8E", fontFamily: "Inter, sans-serif" }}>{titulo}</div>}
    </div>
  );
}
