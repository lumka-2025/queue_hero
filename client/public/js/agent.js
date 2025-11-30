// client/public/js/agent.js
document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth();
  if (!auth) { location.href = '/login.html?role=agent'; return; }
  document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); location.href = '/'; });

  const list = document.getElementById('available');

  async function loadAvailable(){
    const res = await apiFetch('/api/requests');
    const data = await res.json();
    list.innerHTML = '';
    if (!Array.isArray(data)) return;
    data.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<div>
        <strong>${r.description}</strong><div class="small">${r.location} • ${r.status}</div>
      </div><div>
        <button class="btn assign" data-id="${r.id}">Take</button>
      </div>`;
      list.appendChild(li);
    });
    document.querySelectorAll('.assign').forEach(b => b.addEventListener('click', assign));
  }

  async function assign(e){
    const id = e.target.dataset.id;
    const eta = prompt('ETA (minutes) — optional');
    const res = await apiFetch(`/api/requests/${id}/assign`, { method:'POST', body: JSON.stringify({ eta }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed');
    await loadAvailable();
  }

  loadAvailable();
  // socket updates (optional)
  const s = io();
  s.on('new_request', () => loadAvailable());
  s.on('update_request', () => loadAvailable());
});

