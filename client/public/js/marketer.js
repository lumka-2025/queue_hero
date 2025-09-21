const API = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('qh_role');
  const token = localStorage.getItem('qh_token');
  if (!token) return location.href = './login.html?role=marketer';

  // Show views by role
  if (role === 'marketer') {
    document.getElementById('marketerCard').classList.remove('hidden');
    loadPending();
  } else {
    document.getElementById('clientCard').classList.remove('hidden');
    loadMyBookings();
  }
});

async function submitBooking(){
  const msg = document.getElementById('m_msg');
  msg.className = 'note'; msg.textContent = 'Submitting…';
  const body = {
    client_id: Number(localStorage.getItem('qh_id')),
    location: document.getElementById('m_location').value.trim(),
    date: document.getElementById('m_date').value,
    time: document.getElementById('m_time').value,
    branding: document.getElementById('m_branding').value.trim()
  };
  const res = await fetch(`${API}/api/marketer/book`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  const data = await res.json().catch(()=>({error:'Bad response'}));
  if(!res.ok){ msg.className='note error'; msg.textContent=data.error||'Failed'; return; }
  msg.className='note success'; msg.textContent='Booking submitted!';
  loadMyBookings();
}

async function loadMyBookings(){
  const tbody = document.querySelector('#m_my tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="note">Loading…</td></tr>';
  const id = Number(localStorage.getItem('qh_id'));
  const res = await fetch(`${API}/api/marketer/my-bookings/${id}`);
  const items = await res.json().catch(()=>[]);
  tbody.innerHTML = '';
  items.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td><td>${r.location}</td><td>${r.date}</td><td>${r.time}</td><td>${r.status}</td>`;
    tbody.appendChild(tr);
  });
  if (!items.length) tbody.innerHTML = '<tr><td colspan="5" class="note">No bookings yet.</td></tr>';
}

async function loadPending(){
  const tbody = document.querySelector('#m_pending tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="note">Loading…</td></tr>';
  const res = await fetch(`${API}/api/marketer/pending`);
  const items = await res.json().catch(()=>[]);
  tbody.innerHTML = '';
  items.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td><td>${r.location}</td><td>${r.date}</td><td>${r.time}</td><td>${r.branding||''}</td>
      <td><button class="btn success" onclick="acceptBooking(${r.id})">Accept</button></td>
    `;
    tbody.appendChild(tr);
  });
  if (!items.length) tbody.innerHTML = '<tr><td colspan="6" class="note">No pending activations.</td></tr>';
}

async function acceptBooking(id){
  const res = await fetch(`${API}/api/marketer/update`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ id, status: 'accepted' })
  });
  if (res.ok) loadPending();
}

// Global
function logout(){ localStorage.clear(); location.href='./index.html'; }
window.submitBooking = submitBooking;
window.acceptBooking = acceptBooking;
window.logout = logout;

