// client/public/js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const role = document.getElementById('role');
  const btn = document.getElementById('loginBtn');
  const msg = document.getElementById('msg');

  btn.addEventListener('click', async () => {
    msg.textContent = '';
    const u = username.value.trim();
    const p = password.value;
    const r = role.value;
    if (!u || !p) { msg.textContent = 'Please fill fields'; return; }
    try {
      const res = await fetch('/api/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (!res.ok) { msg.textContent = data.error || 'Login failed'; return; }
      saveAuth(data.user, data.token);
      // redirect based on role (frontend override tag still, but server validates)
      if (data.user.role === 'agent') location.href = '/agent.html';
      else if (data.user.role === 'marketer') location.href = '/marketer.html';
      else location.href = '/customer.html';
    } catch (e) {
      msg.textContent = 'Network error';
    }
  });
});

