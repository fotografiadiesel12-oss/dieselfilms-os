// Liga os avisos no aparelho (notificação no celular/PC mesmo com o CRM
// fechado). Quem envia é o servidor (api/_lib/notificar.js); aqui só
// inscrevemos o navegador e guardamos a inscrição em /api/push.
import { authHeaders } from "./authHeaders.js";

const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const abertoComoApp = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export function registrarAjudante() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// "ativo" | "desligado" | "bloqueado" | "iphone-tela-inicio" | "sem-suporte"
export async function estadoAvisos() {
  const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!suporta) return ehIphone() && !abertoComoApp() ? "iphone-tela-inicio" : "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return "desligado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub ? "ativo" : "desligado";
}

const chaveBytes = (base64) => {
  const b64 = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

// precisa ser chamada a partir de um clique (o navegador exige)
export async function ativarAvisos() {
  const res = await fetch("/api/push", { headers: authHeaders() });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok || !dados.publicKey) throw new Error("Os avisos no aparelho ainda não foram configurados no servidor.");

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Você não liberou as notificações neste aparelho.");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(dados.publicKey) });

  const salvo = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!salvo.ok) throw new Error("Não deu pra salvar a inscrição. Tente de novo.");
}

export async function desativarAvisos() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await fetch("/api/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}
