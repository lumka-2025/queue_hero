// Check if the user is logged in
const isLoggedIn = !!localStorage.getItem('qh_token');

// Redirect to login if not logged in, except for login & register pages
if (
  !isLoggedIn &&
  !window.location.pathname.includes('login.html') &&
  !window.location.pathname.includes('register.html')
) {
  window.location.href = './login.html';
}

// Logout function
function logout() {
  localStorage.removeItem('qh_token');
  window.location.href = './index.html';
}

// Make logout button work everywhere
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});

