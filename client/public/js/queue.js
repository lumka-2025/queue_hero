// client/public/js/queue.js
async function fetchRequests() {
  const token = localStorage.getItem('qh_token');
  if (!token) {
    document.getElementById('requestList').textContent = 'Please log in to see your requests.';
    return;
  }

  try {
    const res = await fetch('/api/requests', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) {
      document.getElementById('requestList').textContent = data.message || 'Error loading requests';
      return;
    }

    if (!data.requests.length) {
      document.getElementById('requestList').textContent = 'No requests yet.';
      return;
    }

    const ul = document.createElement('ul');
    data.requests.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r.details + ' — ' + new Date(r.created_at).toLocaleString();
      ul.appendChild(li);
    });
    fetch('/api/requests')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('requestsList');
      list.innerHTML = '';
      data.forEach(req => {
        const li = document.createElement('li');
        li.textContent = `${req.details} — ${new Date(req.created_at).toLocaleString()}`;
        list.appendChild(li);
      });
    });


  } catch (err) {
    document.getElementById('requestList').textContent = 'Network error';
  }
}

document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('qh_token');
  const details = document.getElementById('requestText').value.trim();

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ details })
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Error submitting request');
      return;
    }
    document.getElementById('requestText').value = '';
    fetchRequests();
  } catch (err) {
    alert('Network error');
  }
});

document.addEventListener('DOMContentLoaded', fetchRequests);

