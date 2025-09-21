const API = 'http://localhost:3000';

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;
  const msg = document.getElementById('msg');

  msg.className = 'note'; msg.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API}/api/login`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      msg.className = 'note error';
      msg.textContent = data.error || 'Login failed';
      return;
    }

    // Save
    localStorage.setItem('qh_token', data.token);
    localStorage.setItem('qh_role', data.role);
    localStorage.setItem('qh_name', data.name);
    localStorage.setItem('qh_id', data.id);

    // Route by actual server role, not the selected dropdown
    if (data.role === 'agent') location.href = './agent.html';
    else if (data.role === 'marketer') location.href = './marketer.html';
    else location.href = './queue.html';
  } catch (e) {
    msg.className = 'note error';
    msg.textContent = 'Network error';
  }
});

