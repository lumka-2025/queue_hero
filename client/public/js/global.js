// client/public/js/global.js
const API_BASE = (() => {
  // prefer same host; dev: http://localhost:3000
  const host = location.hostname === 'localhost' ? 'http://localhost:3000' : '';
  return host;
})();

function saveAuth(user, token) {
  localStorage.setItem('qh_user', JSON.stringify(user));
  localStorage.setItem('qh_token', token);
}
function getAuth() {
  const u = localStorage.getItem('qh_user');
  const t = localStorage.getItem('qh_token');
  return u && t ? { user: JSON.parse(u), token: t } : null;
}
function clearAuth() {
  localStorage.removeItem('qh_user');
  localStorage.removeItem('qh_token');
}

function apiFetch(path, opts = {}) {
  const auth = getAuth();
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  if (auth) headers['Authorization'] = 'Bearer ' + auth.token;
  return fetch(API_BASE + path, Object.assign({}, opts, { headers }));
}

/* theme */
(function themeInit(){
  const tbtn = document.getElementById('themeToggle');
  const theme = localStorage.getItem('qh_theme') || 'light';
  if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  if (tbtn){
    tbtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      if (next === 'dark') document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('qh_theme', next);
    });
  }
})();

/* role query param helper */
function preselectRoleFromQuery() {
  const url = new URL(location.href);
  const r = url.searchParams.get('role');
  if (r) {
    const select = document.getElementById('role');
    if (select) select.value = r;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('darkModeToggle');
  if(toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
  }

  //Loads saved performance
  if(localStorage.getItem('dark-mode') === 'true' {
    document.body.classList.add('dark-mode');
  }
  
});

document.addEventListener('DOMContentLoaded', preselectRoleFromQuery);

