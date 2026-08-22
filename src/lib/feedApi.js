async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} ao falar com o feed.`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listPosts() {
  return request("/api/feed");
}

export function createPost(data) {
  return request("/api/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updatePost(id, data) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deletePost(id) {
  return request(`/api/feed/${encodeURIComponent(id)}`, { method: "DELETE" });
}
