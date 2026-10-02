// Recebe os avisos do CRM (menções, comentários, reações, @Todos) e mostra a
// notificação no celular/PC, mesmo com o CRM fechado.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch { dados = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(dados.title || "DieselFilms OS", {
    body: dados.body || "",
    icon: "/apple-touch-icon.png",
    badge: "/favicon.png",
    data: { url: dados.url || "/" },
    ...(dados.tag ? { tag: dados.tag, renotify: true } : {}),
    // mensagem do chat: vibra e fica na tela até a pessoa ver
    ...(dados.prioridade === "alta" ? { requireInteraction: true, vibrate: [200, 100, 200], silent: false } : {}),
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
    const aberta = janelas.find((j) => j.url.startsWith(self.location.origin));
    if (aberta) {
      aberta.postMessage({ tipo: "abrir", url });
      return aberta.focus();
    }
    return self.clients.openWindow(url);
  }));
});
