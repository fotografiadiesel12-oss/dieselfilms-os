async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} ao falar com as notificações.`);
  }
  return res.json();
}

export function listNotifications(userId) {
  return request(`/api/notifications?userId=${encodeURIComponent(userId)}`);
}

export function createNotification(data) {
  return request("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lida: true }),
  });
}
