// Shared client for authenticated API calls. Assumes firebase auth is initialized on the page.
const API = {
  async token() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not signed in');
    return user.getIdToken(/* forceRefresh */ true);
  },

  async fetch(path, options = {}) {
    const token = await this.token();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status, body });
    return body;
  },

  get(path) { return this.fetch(path); },
  post(path, data) { return this.fetch(path, { method: 'POST', body: JSON.stringify(data || {}) }); },
  patch(path, data) { return this.fetch(path, { method: 'PATCH', body: JSON.stringify(data || {}) }); },
  del(path) { return this.fetch(path, { method: 'DELETE' }); }
};

window.API = API;