// client/public/js/marketer.js
document.addEventListener('DOMContentLoaded', () => {
  const auth = getAuth();
  if (!auth) { location.href = '/login.html?role=marketer'; return; }
  document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); location.href = '/'; });

  const title = document.getElementById('title');
  const locationInput = document.getElementById('location');
  const details = document.getElementById('details');
  const btn = document.getElementById('bookBtn');

  btn.addEventListener('click', async () => {
    const t = title.value.trim(), l = locationInput.value.trim(), d = details.value.trim();
    if (!t || !l) return alert('Please fill title and location');
    const res = await apiFetch('/api/bookings', { method:'POST', body: JSON.stringify({ title: t, location: l, details: d }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed');
    alert('Booked successfully');
    title.value=''; locationInput.value=''; details.value='';
  });
});

