// One wrapper for every server call: sends the CSRF header and the session
// cookie, turns errors into ApiError with a readable (German) message, retries
// reads while the server restarts, and reports a lost session to the app.
const HEADERS = { 'X-Requested-With': 'ba-lernplattform' };

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function request(url, { method = 'GET', json, body, signal, keepalive = false } = {}) {
  const init = { method, headers: { ...HEADERS }, credentials: 'same-origin', signal };
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  } else if (body !== undefined) {
    init.body = body;
  }
  // keepalive lets a save finish while the page closes — but browsers cap its
  // body at 64 KB, so bigger saves go as normal requests (and usually make it,
  // because the save on tab-hide ran first).
  if (keepalive && typeof init.body === 'string' && init.body.length < 60000) init.keepalive = true;

  // Reads are retried a few times on a network error / 502 / 503, so a server
  // restart (node --watch, deploy) doesn't break the page.
  const tries = method === 'GET' ? 4 : 1;
  for (let i = 0; ; i += 1) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (i + 1 < tries) { await wait(400 * (i + 1)); continue; }
      throw new ApiError(0, 'offline', 'Keine Verbindung zum Server.');
    }
    if ((res.status === 502 || res.status === 503) && i + 1 < tries) { await wait(400 * (i + 1)); continue; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('ba:unauthorized'));
      throw new ApiError(res.status, data.error || 'error', data.message || `Fehler ${res.status}`);
    }
    return data;
  }
}

const enc = encodeURIComponent;

export const api = {
  // Login
  me: () => request('/api/auth/me').then((d) => d.user),
  login: (username, password) => request('/api/auth/login', { method: 'POST', json: { username, password } }).then((d) => d.user),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Semesters & subjects
  semesters: () => request('/api/semesters').then((d) => d.semesters),
  createSemester: (data) => request('/api/semesters', { method: 'POST', json: data }).then((d) => d.semester),
  updateSemester: (id, patch) => request(`/api/semesters/${enc(id)}`, { method: 'PATCH', json: patch }).then((d) => d.semester),
  deleteSemester: (id) => request(`/api/semesters/${enc(id)}`, { method: 'DELETE' }),
  orderSubjects: (semesterId, ids) => request(`/api/semesters/${enc(semesterId)}/order`, { method: 'POST', json: { ids } }),
  subject: (id) => request(`/api/subjects/${enc(id)}`),
  cards: (id) => request(`/api/subjects/${enc(id)}/cards`),
  createSubject: (data) => request('/api/subjects', { method: 'POST', json: data }).then((d) => d.subject),
  updateSubject: (id, patch) => request(`/api/subjects/${enc(id)}`, { method: 'PATCH', json: patch }).then((d) => d.subject),
  deleteSubject: (id) => request(`/api/subjects/${enc(id)}`, { method: 'DELETE' }),
  orderChapters: (subjectId, ids) => request(`/api/subjects/${enc(subjectId)}/order`, { method: 'POST', json: { ids } }),

  // Chapters
  recentChapters: (n = 6) => request(`/api/chapters?recent=${n}`).then((d) => d.chapters),
  chapter: (id) => request(`/api/chapters/${enc(id)}`),
  createChapter: (data) => request('/api/chapters', { method: 'POST', json: data }).then((d) => d.chapter),
  updateChapter: (id, patch, opts = {}) => request(`/api/chapters/${enc(id)}`, { method: 'PATCH', json: patch, ...opts }).then((d) => d.chapter),
  deleteChapter: (id) => request(`/api/chapters/${enc(id)}`, { method: 'DELETE' }).then((d) => d.trashId),
  uploadFile: (chapterId, file) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return request(`/api/chapters/${enc(chapterId)}/files`, { method: 'POST', body: fd }).then((d) => d.file);
  },

  // Trash
  trash: () => request('/api/trash').then((d) => d.items),
  restoreTrash: (id) => request(`/api/trash/${enc(id)}/restore`, { method: 'POST' }).then((d) => d.chapter),
  purgeTrash: (id) => request(`/api/trash/${enc(id)}`, { method: 'DELETE' }),

  // Search
  search: (q, signal) => request(`/api/search?q=${enc(q)}`, { signal }).then((d) => d.results),
};

/** URL of an uploaded file (blocks store paths like "chapters/<id>/<name>"). */
export const fileUrl = (src) => (src ? `/data/${src.split('/').map(enc).join('/')}` : '');
