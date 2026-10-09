// public/js/dashboard.js
// Consume la API local (mismo origen, sin token porque por ahora no hay login)
// y arma el panel de control: ventas de hoy, stock bajo y KPIs generales.

// Umbral de stock bajo. Es un valor fijo simple para arrancar;
// el día de mañana se puede convertir en un campo configurable
// por producto o en un input en la propia pantalla.
const UMBRAL_STOCK_BAJO = 5;

const money = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value || 0);

const elLoading = document.getElementById('loading-state');
const elError = document.getElementById('error-state');
const elContent = document.getElementById('dashboard-content');

const showLoading = () => {
  elLoading.hidden = false;
  elError.hidden = true;
  elContent.hidden = true;
};

const showError = () => {
  elLoading.hidden = true;
  elError.hidden = false;
  elContent.hidden = true;
};

const showContent = () => {
  elLoading.hidden = true;
  elError.hidden = true;
  elContent.hidden = false;
};

const esDeHoy = (fechaISO) => {
  const fecha = new Date(fechaISO);
  const hoy = new Date();

  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
};

const renderVentasDeHoy = (ventas) => {
  const ventasDeHoy = ventas.filter(
    (venta) => esDeHoy(venta.createdAt) && venta.status !== 'cancelled' && venta.status !== 'closed'
  );

  const total = ventasDeHoy.reduce((acc, venta) => acc + venta.total, 0);
  const unidades = ventasDeHoy.reduce(
    (acc, venta) => acc + venta.items.reduce((a, item) => a + item.quantity, 0),
    0
  );

  document.getElementById('ventas-total').textContent = money(total);
  document.getElementById('ventas-cantidad').textContent = ventasDeHoy.length;
  document.getElementById('ventas-unidades').textContent = unidades;
};

const renderStockBajo = (productos) => {
  const lista = document.getElementById('stock-lista');
  const vacio = document.getElementById('stock-vacio');

  document.getElementById('umbral-stock').textContent = UMBRAL_STOCK_BAJO;

  const bajoStock = productos
    .filter((producto) => producto.stock <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => a.stock - b.stock);

  lista.innerHTML = '';

  if (bajoStock.length === 0) {
    vacio.hidden = false;
    return;
  }

  vacio.hidden = true;

  for (const producto of bajoStock) {
    const item = document.createElement('li');
    item.className = 'stock-item';

    const nombre = document.createElement('span');
    nombre.className = 'stock-item__name';
    const variante = [producto.size, producto.color].filter(Boolean).join(' / ');
    nombre.textContent = variante ? `${producto.name} (${variante})` : producto.name;

    const badge = document.createElement('span');
    badge.className = 'stock-item__badge';
    if (producto.stock === 0) {
      badge.classList.add('stock-item__badge--critico');
    }
    badge.textContent =
      producto.stock === 0 ? 'sin stock' : `${producto.stock} u.`;

    item.appendChild(nombre);
    item.appendChild(badge);
    lista.appendChild(item);
  }
};

const renderKpis = (productos) => {
  const unidadesEnStock = productos.reduce((acc, p) => acc + p.stock, 0);
  const valorInventario = productos.reduce(
    (acc, p) => acc + p.stock * p.price,
    0
  );

  document.getElementById('kpi-productos').textContent = productos.length;
  document.getElementById('kpi-unidades-stock').textContent = unidadesEnStock;
  document.getElementById('kpi-valor-inventario').textContent =
    money(valorInventario);
};

const cargarDashboard = async () => {
  showLoading();

  try {
    const [resProductos, resVentas] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/sales')
    ]);

    if (!resProductos.ok || !resVentas.ok) {
      throw new Error('Respuesta no exitosa de la API');
    }

    const productos = await resProductos.json();
    const ventas = await resVentas.json();

    renderVentasDeHoy(ventas);
    renderStockBajo(productos);
    renderKpis(productos);

    showContent();

  } catch (error) {
    console.error('Error cargando el dashboard:', error);
    showError();
  }
};

document.getElementById('refresh-btn').addEventListener('click', cargarDashboard);
document.getElementById('retry-btn').addEventListener('click', cargarDashboard);

// --- Actualizar desde Excel ---

const importarBtn = document.getElementById('importar-excel-btn');
const importarInput = document.getElementById('importar-excel-input');
const importFeedback = document.getElementById('import-feedback');

const mostrarImportFeedback = (mensaje, tipo) => {
  importFeedback.textContent = mensaje;
  importFeedback.className = `feedback feedback--${tipo}`;
  importFeedback.hidden = false;
};

importarBtn.addEventListener('click', () => importarInput.click());

importarInput.addEventListener('change', async () => {
  const archivo = importarInput.files[0];
  if (!archivo) return;

  importarBtn.disabled = true;
  importarBtn.textContent = 'Actualizando...';

  const datos = new FormData();
  datos.append('archivo', archivo);

  try {
    const res = await fetch('/api/import/excel', {
      method: 'POST',
      body: datos
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarImportFeedback(data.error || 'No se pudo procesar el archivo.', 'error');
      return;
    }

    const partes = [`${data.creados} producto(s) nuevo(s)`, `${data.actualizados} actualizado(s)`];
    if (data.saltados.length > 0) {
      partes.push(`${data.saltados.length} fila(s) salteada(s) por datos incompletos`);
    }
    mostrarImportFeedback(`Excel procesado: ${partes.join(', ')}.`, 'ok');

    cargarDashboard();

  } catch (error) {
    console.error('Error importando Excel:', error);
    mostrarImportFeedback('No se pudo conectar con el servidor.', 'error');
  } finally {
    importarBtn.disabled = false;
    importarBtn.textContent = 'Actualizar desde Excel';
    importarInput.value = '';
  }
});

cargarDashboard();
