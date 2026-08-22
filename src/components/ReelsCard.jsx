import React from "react";
import { Play, Heart, MessageCircle, Send, Bookmark } from "lucide-react";

/*
  Card visual que imita o layout de Reels/TikTok (capa vertical, avatar,
  botão de seguir, ícones de curtir/comentar/compartilhar). É puramente
  decorativo — os dados (capa, @usuário, link) são preenchidos manualmente
  ao montar o orçamento; não existe integração real com a API do Instagram
  (exigiria app aprovado pela Meta). Clicar no card abre o link real do post.
*/
export default function ReelsCard({ thumbnailUrl, handle, profilePicUrl, link, titulo }) {
  const initials = (handle || "?").replace(/^@/, "").slice(0, 2).toUpperCase();

  const content = (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "9 / 16",
        maxWidth: 220,
        borderRadius: 14,
        overflow: "hidden",
        backgroundImage: thumbnailUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.65)), url(${thumbnailUrl})`
          : "linear-gradient(160deg, #262626, #000)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* topo: avatar + @usuário + seguir */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 44, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
          background: "#444", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, border: "1px solid rgba(255,255,255,0.6)",
        }}>
          {profilePicUrl ? (
            <img src={profilePicUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : initials}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {handle || "@perfil"}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.8)", flexShrink: 0,
        }}>
          Seguir
        </span>
      </div>

      {/* play central */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Play size={18} fill="#fff" color="#fff" />
        </div>
      </div>

      {/* ícones laterais */}
      <div style={{ position: "absolute", right: 8, bottom: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Heart size={20} fill="#fff" color="#fff" />
        <MessageCircle size={20} fill="#fff" color="#fff" />
        <Send size={19} color="#fff" />
        <Bookmark size={19} color="#fff" />
      </div>

      {/* legenda */}
      {titulo && (
        <div style={{
          position: "absolute", left: 10, right: 44, bottom: 10,
          fontSize: 11, lineHeight: 1.3, textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {titulo}
        </div>
      )}
    </div>
  );

  if (!link) return content;
  return (
    <a href={link} target="_blank" rel="noreferrer" style={{ display: "inline-block", textDecoration: "none" }}>
      {content}
    </a>
  );
}
