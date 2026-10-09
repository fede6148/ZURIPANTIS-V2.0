(function () {
  const TOKEN_KEY = 'zuripantis_token';
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const fetchOriginal = window.fetch;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url && url.startsWith('/api')) {
      init.headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
    }

    const respuesta = await fetchOriginal(input, init);

    if (respuesta.status === 401 || respuesta.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login.html';
    }

    return respuesta;
  };

  document.addEventListener('DOMContentLoaded', () => {
    const barra = document.createElement('div');
    barra.style.cssText = 'position:fixed; top:8px; right:8px; z-index:9999; display:flex; gap:8px; font-family:sans-serif; font-size:0.85rem;';
    barra.innerHTML =
      '<a href="/cambiar-password.html" style="background:#fff7f0; border:2px solid #17161a; padding:4px 10px; border-radius:6px; text-decoration:none; color:#17161a;">Cambiar contraseña</a>' +
      '<a href="#" id="cerrarSesionLink" style="background:#ff3e7f; border:2px solid #17161a; padding:4px 10px; border-radius:6px; text-decoration:none; color:#fff7f0;">Cerrar sesión</a>';
    document.body.appendChild(barra);

    document.getElementById('cerrarSesionLink').addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login.html';
    });
  });
})();
