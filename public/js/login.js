const ADMIN_EMAIL = 'admin@zuripantis.local';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password })
    });

    const data = await resp.json();

    if (!resp.ok) {
      errorEl.textContent = data.error || 'No se pudo iniciar sesión';
      return;
    }

    sessionStorage.setItem('zuripantis_token', data.token);
    window.location.href = '/index.html';
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor';
  }
});
