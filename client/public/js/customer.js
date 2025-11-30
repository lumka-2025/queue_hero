// client/public/js/customer.js
document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth();
  if (!auth) { location.href = '/login.html?role=customer'; return; }

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearAuth(); location.href = '/';
  });

  const desc = document.getElementById('description');
  const loc = document.getElementById('location');
  const submitBtn = document.getElementById('submitReq');
  const list = document.getElementById('requests');

  async function loadRequests(){
    const res = await apiFetch('/api/requests');
    const data = await res.json();
    list.innerHTML = '';
    if (!Array.isArray(data)) return;
    data.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<div>
        <strong>${r.description}</strong><div class="small">${r.location} • ${r.status}</div>
      </div><div><button data-id="${r.id}" class="btn">View</button></div>`;
      list.appendChild(li);
    });
  }

  submitBtn.addEventListener('click', async () => {
    const d = desc.value.trim(); const l = loc.value.trim();
    if (!d || !l) return alert('Please enter details');
    const res = await apiFetch('/api/requests', { method:'POST', body: JSON.stringify({ description: d, location: l }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed');
    desc.value=''; loc.value='';
    await loadRequests();
  });

  loadRequests();
});

