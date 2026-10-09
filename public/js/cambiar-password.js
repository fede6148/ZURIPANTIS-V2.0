document.getElementById('cambiarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const actual = document.getElementById('actual').value;
  const nueva = document.getElementById('nueva').value;
  const confirmar = document.getElementById('confirmar').value;
  const mensajeEl = document.getElementById('mensaje');
  mensajeEl.textContent = '';
  mensajeEl.className = '';

  if (nueva !== confirmar) {
    mensajeEl.textContent = 'Las contraseñas nuevas no coinciden';
    mensajeEl.className = 'error';
    return;
  }

  try {
    const resp = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: actual, newPassword: nueva })
    });

    const data = await resp.json();

    if (!resp.ok) {
      mensajeEl.textContent = data.error || 'No se pudo cambiar la contraseña';
      mensajeEl.className = 'error';
      return;
    }

    mensajeEl.textContent = 'Contraseña actualizada. La próxima vez usá la nueva.';
    mensajeEl.className = 'ok';
    document.getElementById('cambiarForm').reset();
  } catch (err) {
    mensajeEl.textContent = 'No se pudo conectar con el servidor';
    mensajeEl.className = 'error';
  }
});
