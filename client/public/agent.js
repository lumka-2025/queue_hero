async function fetchAllRequests() {
  const token = localStorage.getItem('qh_token');
  if (!token) return;

  const res = await fetch('/api/requests/all', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!res.ok) {
    document.getElementById('requestList').textContent = data.message || 'Error';
    return;
  }

  if (!data.requests.length) {
    document.getElementById('requestList').textContent = 'No requests found.';
    return;
  }

  const ul = document.createElement('ul');
  data.requests.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${r.username}</strong>: ${r.details}
      <small>${new Date(r.created_at).toLocaleString()}</small>
      <button onclick="markDone(${r.id})">✅ Done</button>
      <button onclick="deleteRequest(${r.id})">🗑 Remove</button>
    `;
    ul.appendChild(li);
  });
  document.getElementById('requestList').innerHTML = '';
  document.getElementById('requestList').appendChild(ul);
}

async function markDone(id) {
  const token = localStorage.getItem('qh_token');
  await fetch(`/api/requests/${id}/done`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchAllRequests();
}

async function deleteRequest(id) {
  const token = localStorage.getItem('qh_token');
  await fetch(`/api/requests/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchAllRequests();
}

document.addEventListener('DOMContentLoaded', fetchAllRequests);

