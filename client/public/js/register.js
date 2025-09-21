document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value; // 👈 fixes the loop issue

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });

  const data = await res.json();

  if (res.ok) {
    alert('Registration successful, please log in');
    window.location.href = 'login.html';
  } else {
    alert(data.error || 'Registration failed');
  }
});

