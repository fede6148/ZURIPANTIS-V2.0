// public/js/productos.js
// Pantalla de gestión de productos: lista, alta continua (popup),
// edición y baja.

const money = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value || 0);

const form = document.getElementById('producto-form');
const idInput = document.getElementById('producto-id');
const nombreInput = document.getElementById('producto-nombre');
const precioInput = document.getElementById('producto-precio');
const stockInput = document.getElementById('producto-stock');
const marcaInput = document.getElementById('producto-marca');
const categoriaInput = document.getElementById('producto-categoria');
const talleInput = document.getElementById('producto-talle');
const colorInput = document.getElementById('producto-color');
const descripcionInput = document.getElementById('producto-descripcion');
const formFeedback = document.getElementById('form-feedback');

const popupOverlay = document.getElementById('popup-overlay');
const popupTitle = document.getElementById('popup-title');
const popupSubtitle = document.getElementById('popup-subtitle');
const popupCloseBtn = document.getElementById('popup-close-btn');
const abrirPopupBtn = document.getElementById('abrir-popup-btn');

const accionesNuevo = document.getElementById('acciones-nuevo');
const accionesEdicion = document.getElementById('acciones-edicion');
const finalizarCargaBtn = document.getElementById('finalizar-carga-btn');
const cancelarEdicionBtn = document.getElementById('cancelar-edicion-btn');

const tbody = document.getElementById('productos-tbody');
const tablaLoading = document.getElementById('tabla-loading');
const tablaError = document.getElementById('tabla-error');
const tablaWrap = document.getElementById('tabla-wrap');
const tablaVacia = document.getElementById('tabla-vacia');

const buscarInput = document.getElementById('buscar-input');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroTalle = document.getElementById('filtro-talle');
const filtroColor = document.getElementById('filtro-color');
const filtroStockBajo = document.getElementById('filtro-stock-bajo');
const filtroResultado = document.getElementById('filtro-resultado');

// Mismo umbral que usa el dashboard para "stock bajo"
const UMBRAL_STOCK_BAJO = 5;

// Último listado que trajo la API, para filtrar en el navegador
// sin tener que volver a pedirlo cada vez que cambia un filtro.
let productosActuales = [];

// 'nuevo' mientras se están cargando productos en cadena,
// 'edicion' cuando el popup se abrió para corregir uno existente.
let modoPopup = 'nuevo';

const normalizar = (texto) =>
  (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const mostrarFeedback = (mensaje, tipo) => {
  formFeedback.textContent = mensaje;
  formFeedback.className = `feedback feedback--${tipo}`;
  formFeedback.hidden = false;
};

const ocultarFeedback = () => {
  formFeedback.hidden = true;
};

const limpiarForm = () => {
  form.reset();
  idInput.value = '';
};

const abrirPopupNuevo = () => {
  modoPopup = 'nuevo';
  limpiarForm();
  ocultarFeedback();
  popupTitle.textContent = 'Nuevo producto';
  popupSubtitle.textContent = 'Cargá los datos y guardá — el formulario queda listo para el siguiente producto';
  accionesNuevo.hidden = false;
  accionesEdicion.hidden = true;
  popupOverlay.hidden = false;
  nombreInput.focus();
};

const abrirPopupEdicion = (producto) => {
  modoPopup = 'edicion';
  idInput.value = producto.id;
  nombreInput.value = producto.name;
  precioInput.value = producto.price;
  stockInput.value = producto.stock;
  categoriaInput.value = producto.category || '';
  marcaInput.value = producto.brand || '';
  talleInput.value = producto.size || '';
  colorInput.value = producto.color || '';
  descripcionInput.value = producto.description || '';
  ocultarFeedback();
  popupTitle.textContent = `Editando: ${producto.name}`;
  popupSubtitle.textContent = 'Modificá los datos y guardá los cambios';
  accionesNuevo.hidden = true;
  accionesEdicion.hidden = false;
  popupOverlay.hidden = false;
  nombreInput.focus();
};

const cerrarPopup = () => {
  popupOverlay.hidden = true;
  limpiarForm();
  ocultarFeedback();
};

const renderTabla = (productos) => {
  tablaLoading.hidden = true;
  tablaError.hidden = true;

  if (productos.length === 0) {
    tablaWrap.hidden = true;
    tablaVacia.hidden = false;
    return;
  }

  tablaVacia.hidden = true;
  tablaWrap.hidden = false;

  tbody.innerHTML = '';

  for (const producto of productos) {
    const tr = document.createElement('tr');

    const tdNombre = document.createElement('td');
    tdNombre.textContent = producto.name;

    const tdMarca = document.createElement('td');
    tdMarca.textContent = producto.brand || '—';

    const tdCategoria = document.createElement('td');
    tdCategoria.textContent = producto.category || '—';

    const tdTalle = document.createElement('td');
    tdTalle.textContent = producto.size || '—';

    const tdColor = document.createElement('td');
    tdColor.textContent = producto.color || '—';

    const tdDescripcion = document.createElement('td');
    tdDescripcion.textContent = producto.description || '—';

    const tdPrecio = document.createElement('td');
    tdPrecio.textContent = money(producto.price);

    const tdStock = document.createElement('td');
    tdStock.textContent = producto.stock;

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'table-actions';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'icon-btn';
    btnEditar.type = 'button';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => abrirPopupEdicion(producto));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'icon-btn icon-btn--danger';
    btnEliminar.type = 'button';
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => eliminarProducto(producto));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);

    tr.appendChild(tdNombre);
    tr.appendChild(tdMarca);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdTalle);
    tr.appendChild(tdColor);
    tr.appendChild(tdDescripcion);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdStock);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  }
};

// Arma un <select> con los valores distintos que existan en el
// catálogo actual (talle, color), ordenados, sin depender de una
// lista fija — se arma sola a partir de lo que ya cargaste.
const poblarSelectDeValores = (select, productos, campo) => {
  const valorPrevio = select.value;

  const valores = Array.from(
    new Set(productos.map((p) => p[campo]).filter((v) => v && v.trim() !== ''))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  select.innerHTML = '<option value="">Todos</option>';
  for (const valor of valores) {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  }

  if (valores.includes(valorPrevio)) {
    select.value = valorPrevio;
  }
};

const aplicarFiltros = () => {
  const texto = normalizar(buscarInput.value);
  const categoria = filtroCategoria.value;
  const talle = filtroTalle.value;
  const color = filtroColor.value;
  const soloStockBajo = filtroStockBajo.checked;

  const filtrados = productosActuales.filter((producto) => {
    const coincideTexto =
      !texto ||
      normalizar(producto.name).includes(texto) ||
      normalizar(producto.brand).includes(texto) ||
      normalizar(producto.description).includes(texto);

    const coincideCategoria = !categoria || producto.category === categoria;
    const coincideTalle = !talle || producto.size === talle;
    const coincideColor = !color || producto.color === color;

    const coincideStock = !soloStockBajo || producto.stock <= UMBRAL_STOCK_BAJO;

    return coincideTexto && coincideCategoria && coincideTalle && coincideColor && coincideStock;
  });

  tablaVacia.textContent =
    productosActuales.length === 0
      ? 'Todavía no cargaste ningún producto. Usá "Cargar productos" para empezar.'
      : 'Ningún producto coincide con la búsqueda / filtros aplicados.';

  filtroResultado.textContent =
    productosActuales.length === 0
      ? ''
      : `Mostrando ${filtrados.length} de ${productosActuales.length} producto(s)`;

  renderTabla(filtrados);
};

const cargarProductos = async () => {
  tablaLoading.hidden = false;
  tablaError.hidden = true;
  tablaWrap.hidden = true;
  tablaVacia.hidden = true;

  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Respuesta no exitosa');

    productosActuales = await res.json();
    poblarSelectDeValores(filtroCategoria, productosActuales, 'category');
    poblarSelectDeValores(filtroTalle, productosActuales, 'size');
    poblarSelectDeValores(filtroColor, productosActuales, 'color');
    aplicarFiltros();

  } catch (error) {
    console.error('Error cargando productos:', error);
    tablaLoading.hidden = true;
    tablaError.hidden = false;
  }
};

buscarInput.addEventListener('input', aplicarFiltros);
filtroCategoria.addEventListener('change', aplicarFiltros);
filtroTalle.addEventListener('change', aplicarFiltros);
filtroColor.addEventListener('change', aplicarFiltros);
filtroStockBajo.addEventListener('change', aplicarFiltros);

const eliminarProducto = async (producto) => {
  const confirmado = confirm(`¿Eliminar "${producto.name}"? Esta acción no se puede deshacer.`);
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/products/${producto.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'No se pudo eliminar el producto.');
      return;
    }

    cargarProductos();

  } catch (error) {
    console.error('Error eliminando producto:', error);
    alert('No se pudo conectar con el servidor.');
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  ocultarFeedback();

  const id = idInput.value;
  const payload = {
    name: nombreInput.value.trim(),
    price: Number(precioInput.value),
    stock: Number(stockInput.value),
    category: categoriaInput.value || null,
    brand: marcaInput.value.trim() || null,
    size: talleInput.value.trim() || null,
    color: colorInput.value.trim() || null,
    description: descripcionInput.value.trim() || null
  };

  const esEdicion = Boolean(id);
  const url = esEdicion ? `/api/products/${id}` : '/api/products';
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarFeedback(data.error || 'No se pudo guardar el producto', 'error');
      return;
    }

    cargarProductos();

    if (esEdicion) {
      // Corrección puntual: se confirma y se cierra el popup.
      mostrarFeedback('Producto actualizado correctamente.', 'ok');
      setTimeout(cerrarPopup, 500);
    } else {
      // Carga en cadena: se limpia el formulario y queda listo
      // para el siguiente producto, sin cerrar el popup.
      mostrarFeedback(`"${data.name}" cargado. Listo para el siguiente.`, 'ok');
      limpiarForm();
      nombreInput.focus();
    }

  } catch (error) {
    console.error('Error guardando producto:', error);
    mostrarFeedback('No se pudo conectar con el servidor.', 'error');
  }
});

abrirPopupBtn.addEventListener('click', abrirPopupNuevo);
finalizarCargaBtn.addEventListener('click', cerrarPopup);
cancelarEdicionBtn.addEventListener('click', cerrarPopup);
popupCloseBtn.addEventListener('click', cerrarPopup);

// Cerrar haciendo click fuera del popup (en el fondo oscuro)
popupOverlay.addEventListener('click', (event) => {
  if (event.target === popupOverlay) cerrarPopup();
});

// Cerrar con Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !popupOverlay.hidden) cerrarPopup();
});

cargarProductos();
