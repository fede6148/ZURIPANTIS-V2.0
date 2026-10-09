// public/js/ventas.js
// Pantalla para armar una venta con varios productos (carrito),
// registrarla con datos del comprador, y gestionar el ciclo de vida
// de las ventas: activa -> entregada / anulada -> reactivada o
// cerrada definitivamente ("eliminar compra").

const money = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value || 0);

const fechaCorta = (fechaISO) =>
  new Date(fechaISO.replace(' ', 'T') + 'Z').toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

const normalizar = (texto) =>
  (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const etiquetaProducto = (producto) => {
  const variante = [producto.size, producto.color].filter(Boolean).join(' / ');
  return variante ? `${producto.name} (${variante})` : producto.name;
};

const ETIQUETA_ESTADO = {
  completed: 'Activa',
  delivered: 'Entregada',
  cancelled: 'Anulada',
  closed: 'Cancelada'
};

// ============================================================
// Elementos: formulario de carga (autocompletado + carrito)
// ============================================================

const productoInput = document.getElementById('venta-producto-input');
const productoIdInput = document.getElementById('venta-producto-id');
const opcionesList = document.getElementById('venta-producto-opciones');
const inputCantidad = document.getElementById('venta-cantidad');
const stockHint = document.getElementById('stock-hint');
const agregarBtn = document.getElementById('agregar-btn');
const registrarBtn = document.getElementById('registrar-btn');
const vaciarBtn = document.getElementById('vaciar-btn');
const formFeedback = document.getElementById('form-feedback');

const compradorInput = document.getElementById('venta-comprador');
const telefonoInput = document.getElementById('venta-telefono');
const direccionInput = document.getElementById('venta-direccion');
const metodoPagoInput = document.getElementById('venta-metodo-pago');
const observacionesInput = document.getElementById('venta-observaciones');

const carritoVacio = document.getElementById('carrito-vacio');
const carritoWrap = document.getElementById('carrito-wrap');
const carritoTbody = document.getElementById('carrito-tbody');
const carritoTotal = document.getElementById('carrito-total');

let productosPorId = {};
let productosArray = [];
let indiceActivo = -1;
let carrito = []; // [{ productId, quantity }]

// ---------- Popup: Registrar nueva venta ----------

const ventaPopupOverlay = document.getElementById('venta-popup-overlay');
const ventaPopupCloseBtn = document.getElementById('venta-popup-close-btn');
const abrirVentaBtn = document.getElementById('abrir-venta-btn');

const abrirVentaPopup = () => {
  ventaPopupOverlay.hidden = false;
  productoInput.focus();
};

const cerrarVentaPopup = () => {
  ventaPopupOverlay.hidden = true;
};

abrirVentaBtn.addEventListener('click', abrirVentaPopup);
ventaPopupCloseBtn.addEventListener('click', cerrarVentaPopup);
ventaPopupOverlay.addEventListener('click', (event) => {
  if (event.target === ventaPopupOverlay) cerrarVentaPopup();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ventaPopupOverlay.hidden) cerrarVentaPopup();
});

const mostrarFeedback = (mensaje, tipo) => {
  formFeedback.textContent = mensaje;
  formFeedback.className = `feedback feedback--${tipo}`;
  formFeedback.hidden = false;
};

const ocultarFeedback = () => {
  formFeedback.hidden = true;
};

const actualizarHintStock = () => {
  const producto = productosPorId[productoIdInput.value];
  stockHint.textContent = producto
    ? `Stock disponible: ${producto.stock} unidad(es) — ${money(producto.price)} c/u`
    : '';
};

const cerrarOpciones = () => {
  opcionesList.hidden = true;
  opcionesList.innerHTML = '';
  indiceActivo = -1;
};

const seleccionarProducto = (producto) => {
  productoIdInput.value = producto.id;
  productoInput.value = `${etiquetaProducto(producto)} — stock: ${producto.stock}`;
  cerrarOpciones();
  actualizarHintStock();
  inputCantidad.focus();
};

const marcarActivo = () => {
  const items = opcionesList.querySelectorAll('li[data-id]');
  items.forEach((li, i) => li.classList.toggle('is-active', i === indiceActivo));
};

const mostrarOpciones = (texto) => {
  const termino = normalizar(texto);

  const resultados = productosArray
    .filter((p) => p.stock > 0)
    .filter((p) =>
      [p.name, p.category, p.size, p.color].some((campo) => normalizar(campo).includes(termino))
    )
    .slice(0, 15);

  opcionesList.innerHTML = '';
  indiceActivo = -1;

  if (resultados.length === 0) {
    const li = document.createElement('li');
    li.className = 'autocomplete-list__empty';
    li.textContent = 'Sin coincidencias';
    opcionesList.appendChild(li);
  } else {
    for (const producto of resultados) {
      const li = document.createElement('li');
      li.dataset.id = producto.id;
      li.textContent = `${etiquetaProducto(producto)} — stock: ${producto.stock}`;
      li.addEventListener('mousedown', (event) => {
        event.preventDefault();
        seleccionarProducto(producto);
      });
      opcionesList.appendChild(li);
    }
  }

  opcionesList.hidden = false;
};

productoInput.addEventListener('input', () => {
  productoIdInput.value = '';
  actualizarHintStock();

  if (productoInput.value.trim() === '') {
    cerrarOpciones();
    return;
  }

  mostrarOpciones(productoInput.value);
});

productoInput.addEventListener('focus', () => {
  if (productoInput.value.trim() !== '') {
    mostrarOpciones(productoInput.value);
  }
});

productoInput.addEventListener('blur', () => {
  setTimeout(cerrarOpciones, 100);
});

productoInput.addEventListener('keydown', (event) => {
  const items = opcionesList.querySelectorAll('li[data-id]');
  if (opcionesList.hidden || items.length === 0) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    indiceActivo = Math.min(indiceActivo + 1, items.length - 1);
    marcarActivo();
    items[indiceActivo].scrollIntoView?.({ block: 'nearest' });
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    indiceActivo = Math.max(indiceActivo - 1, 0);
    marcarActivo();
    items[indiceActivo].scrollIntoView?.({ block: 'nearest' });
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const elegido = indiceActivo >= 0 ? items[indiceActivo] : items[0];
    const producto = productosPorId[elegido.dataset.id];
    if (producto) seleccionarProducto(producto);
  } else if (event.key === 'Escape') {
    cerrarOpciones();
  }
});

const cargarProductos = async () => {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Respuesta no exitosa');

    productosArray = await res.json();
    productosPorId = Object.fromEntries(productosArray.map((p) => [p.id, p]));

    if (productoIdInput.value && productosPorId[productoIdInput.value]) {
      actualizarHintStock();
    } else {
      productoIdInput.value = '';
      productoInput.value = '';
      stockHint.textContent = '';
    }

  } catch (error) {
    console.error('Error cargando productos:', error);
    mostrarFeedback('No se pudieron cargar los productos disponibles.', 'error');
  }
};

const cantidadEnCarrito = (productId) =>
  carrito
    .filter((item) => item.productId === productId)
    .reduce((acc, item) => acc + item.quantity, 0);

const renderCarrito = () => {
  registrarBtn.disabled = carrito.length === 0;

  if (carrito.length === 0) {
    carritoVacio.hidden = false;
    carritoWrap.hidden = true;
    carritoTotal.textContent = money(0);
    return;
  }

  carritoVacio.hidden = true;
  carritoWrap.hidden = false;
  carritoTbody.innerHTML = '';

  let total = 0;

  carrito.forEach((item, index) => {
    const producto = productosPorId[item.productId];
    const subtotal = producto.price * item.quantity;
    total += subtotal;

    const tr = document.createElement('tr');

    const tdProducto = document.createElement('td');
    tdProducto.textContent = etiquetaProducto(producto);

    const tdCantidad = document.createElement('td');
    tdCantidad.textContent = item.quantity;

    const tdPrecio = document.createElement('td');
    tdPrecio.textContent = money(producto.price);

    const tdSubtotal = document.createElement('td');
    tdSubtotal.textContent = money(subtotal);

    const tdQuitar = document.createElement('td');
    const btnQuitar = document.createElement('button');
    btnQuitar.type = 'button';
    btnQuitar.className = 'icon-btn icon-btn--danger';
    btnQuitar.textContent = 'Quitar';
    btnQuitar.addEventListener('click', () => {
      carrito.splice(index, 1);
      renderCarrito();
    });
    tdQuitar.appendChild(btnQuitar);

    tr.appendChild(tdProducto);
    tr.appendChild(tdCantidad);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdSubtotal);
    tr.appendChild(tdQuitar);

    carritoTbody.appendChild(tr);
  });

  carritoTotal.textContent = money(total);
};

agregarBtn.addEventListener('click', () => {
  ocultarFeedback();

  const productId = Number(productoIdInput.value);
  const quantity = Number(inputCantidad.value);
  const producto = productosPorId[productId];

  if (!productId || !producto) {
    mostrarFeedback('Elegí un producto de la lista de sugerencias.', 'error');
    return;
  }

  if (!quantity || quantity <= 0) {
    mostrarFeedback('La cantidad tiene que ser mayor a 0.', 'error');
    return;
  }

  const yaEnCarrito = cantidadEnCarrito(productId);

  if (yaEnCarrito + quantity > producto.stock) {
    mostrarFeedback(
      `No hay suficiente stock de "${producto.name}" (disponible: ${producto.stock}, ya tenés ${yaEnCarrito} en la venta).`,
      'error'
    );
    return;
  }

  const existente = carrito.find((item) => item.productId === productId);
  if (existente) {
    existente.quantity += quantity;
  } else {
    carrito.push({ productId, quantity });
  }

  inputCantidad.value = 1;
  productoInput.value = '';
  productoIdInput.value = '';
  stockHint.textContent = '';
  productoInput.focus();
  renderCarrito();
});

vaciarBtn.addEventListener('click', () => {
  carrito = [];
  renderCarrito();
  ocultarFeedback();
});

registrarBtn.addEventListener('click', async () => {
  ocultarFeedback();

  if (carrito.length === 0) {
    mostrarFeedback('Agregá al menos un producto antes de registrar la venta.', 'error');
    return;
  }

  registrarBtn.disabled = true;

  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: carrito,
        buyerName: compradorInput.value.trim() || null,
        buyerPhone: telefonoInput.value.trim() || null,
        deliveryAddress: direccionInput.value.trim() || null,
        paymentMethod: metodoPagoInput.value || null,
        notes: observacionesInput.value.trim() || null
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarFeedback(data.error || 'No se pudo registrar la venta.', 'error');
      return;
    }

    formFeedback.innerHTML = '';
    formFeedback.className = 'feedback feedback--ok';
    formFeedback.hidden = false;
    formFeedback.textContent = `Venta #${data.id} registrada por ${money(data.total)}. `;

    const linkTicket = document.createElement('a');
    linkTicket.href = `/ticket.html?venta=${data.id}`;
    linkTicket.target = '_blank';
    linkTicket.textContent = 'Ver / imprimir ticket';
    linkTicket.style.fontWeight = '700';
    formFeedback.appendChild(linkTicket);

    carrito = [];
    renderCarrito();
    compradorInput.value = '';
    telefonoInput.value = '';
    direccionInput.value = '';
    metodoPagoInput.value = '';
    observacionesInput.value = '';
    await cargarProductos();
    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error registrando venta:', error);
    mostrarFeedback('No se pudo conectar con el servidor.', 'error');
  } finally {
    registrarBtn.disabled = carrito.length === 0;
  }
});

// ============================================================
// Pestañas: Últimas ventas / Ventas anuladas / Historial
// ============================================================

const tablaLoading = document.getElementById('tabla-loading');
const tablaError = document.getElementById('tabla-error');

const tabButtons = document.querySelectorAll('#ventas-tabs [data-tab]');
const tabPanels = {
  activas: document.getElementById('tab-activas'),
  anuladas: document.getElementById('tab-anuladas'),
  historial: document.getElementById('tab-historial')
};

let ventasCache = [];
let tabActual = 'activas';

const cambiarTab = (nombre) => {
  tabActual = nombre;
  tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === nombre));
  Object.entries(tabPanels).forEach(([clave, panel]) => {
    panel.hidden = clave !== nombre;
  });
  renderizarTabActual();
};

tabButtons.forEach((btn) => btn.addEventListener('click', () => cambiarTab(btn.dataset.tab)));

// ---------- Tab: Últimas ventas (activas) ----------

const activasVacia = document.getElementById('activas-vacia');
const activasWrap = document.getElementById('tabla-activas-wrap');
const activasTbody = document.getElementById('activas-tbody');

const marcarVentaEntregada = async (venta) => {
  const confirmado = confirm(`¿Marcar la venta #${venta.id} como entregada?`);
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/sales/${venta.id}/entregar`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'No se pudo marcar como entregada.');
      return;
    }

    if (!detalleOverlay.hidden) cerrarDetalle();
    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error marcando entregada:', error);
    alert('No se pudo conectar con el servidor.');
  }
};

const renderActivas = () => {
  const activas = ventasCache.filter((v) => v.status === 'completed');

  if (activas.length === 0) {
    activasVacia.hidden = false;
    activasWrap.hidden = true;
    return;
  }

  activasVacia.hidden = true;
  activasWrap.hidden = false;
  activasTbody.innerHTML = '';

  for (const venta of activas) {
    const tr = document.createElement('tr');

    const tdComprador = document.createElement('td');
    tdComprador.textContent = venta.buyerName || 'Consumidor final';

    const tdFecha = document.createElement('td');
    tdFecha.textContent = fechaCorta(venta.createdAt);

    const tdMonto = document.createElement('td');
    tdMonto.textContent = money(venta.total);

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'table-actions';

    const btnDetalle = document.createElement('button');
    btnDetalle.type = 'button';
    btnDetalle.className = 'icon-btn';
    btnDetalle.textContent = 'Detalle';
    btnDetalle.addEventListener('click', () => abrirDetalle(venta.id));

    const btnEntregado = document.createElement('button');
    btnEntregado.type = 'button';
    btnEntregado.className = 'icon-btn';
    btnEntregado.textContent = 'Entregado';
    btnEntregado.addEventListener('click', () => marcarVentaEntregada(venta));

    tdAcciones.appendChild(btnDetalle);
    tdAcciones.appendChild(btnEntregado);

    tr.append(tdComprador, tdFecha, tdMonto, tdAcciones);
    activasTbody.appendChild(tr);
  }
};

// ---------- Tab: Ventas anuladas ----------

const anuladasVacia = document.getElementById('anuladas-vacia');
const anuladasWrap = document.getElementById('tabla-anuladas-wrap');
const anuladasTbody = document.getElementById('anuladas-tbody');

const renderAnuladas = () => {
  const anuladas = ventasCache.filter((v) => v.status === 'cancelled');

  if (anuladas.length === 0) {
    anuladasVacia.hidden = false;
    anuladasWrap.hidden = true;
    return;
  }

  anuladasVacia.hidden = true;
  anuladasWrap.hidden = false;
  anuladasTbody.innerHTML = '';

  for (const venta of anuladas) {
    const tr = document.createElement('tr');

    const tdComprador = document.createElement('td');
    tdComprador.textContent = venta.buyerName || 'Consumidor final';

    const tdFecha = document.createElement('td');
    tdFecha.textContent = fechaCorta(venta.createdAt);

    const tdMonto = document.createElement('td');
    tdMonto.textContent = money(venta.total);

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'table-actions';

    const btnReactivar = document.createElement('button');
    btnReactivar.type = 'button';
    btnReactivar.className = 'icon-btn';
    btnReactivar.textContent = 'Volver a registrar';
    btnReactivar.addEventListener('click', () => reactivarVenta(venta));

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'icon-btn icon-btn--danger';
    btnEliminar.textContent = 'Eliminar compra';
    btnEliminar.addEventListener('click', () => eliminarCompra(venta));

    tdAcciones.append(btnReactivar, btnEliminar);
    tr.append(tdComprador, tdFecha, tdMonto, tdAcciones);
    anuladasTbody.appendChild(tr);
  }
};

const reactivarVenta = async (venta) => {
  const confirmado = confirm(
    `¿Volver a registrar la venta #${venta.id} (${money(venta.total)})? Se va a descontar stock de nuevo.`
  );
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/sales/${venta.id}/reactivar`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'No se pudo reactivar la venta.');
      return;
    }

    if (data.itemsRemovidos && data.itemsRemovidos.length > 0) {
      alert(
        `Venta reactivada. Aviso: ${data.itemsRemovidos.join(', ')} ya no está(n) en el catálogo y se sacó(sacaron) de esta venta. El total se ajustó a ${money(data.total)}.`
      );
    }

    await cargarProductos();
    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error reactivando venta:', error);
    alert('No se pudo conectar con el servidor.');
  }
};

const eliminarCompra = async (venta) => {
  const confirmado = confirm(
    `¿Eliminar definitivamente la compra #${venta.id}? Esto ya no se puede deshacer: la venta va a quedar cerrada, visible solo en el Historial.`
  );
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/sales/${venta.id}/eliminar-compra`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'No se pudo eliminar la compra.');
      return;
    }

    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error eliminando compra:', error);
    alert('No se pudo conectar con el servidor.');
  }
};

// ---------- Tab: Historial de ventas ----------

const historialBuscar = document.getElementById('historial-buscar');
const historialVacia = document.getElementById('historial-vacia');
const historialWrap = document.getElementById('tabla-historial-wrap');
const historialTbody = document.getElementById('historial-tbody');

const renderHistorial = () => {
  const termino = normalizar(historialBuscar.value);

  const filtradas = ventasCache.filter((v) =>
    !termino || normalizar(v.buyerName || 'consumidor final').includes(termino)
  );

  if (filtradas.length === 0) {
    historialVacia.hidden = false;
    historialWrap.hidden = true;
    historialVacia.textContent =
      ventasCache.length === 0
        ? 'Todavía no hay ventas registradas.'
        : 'Ninguna venta coincide con esa búsqueda.';
    return;
  }

  historialVacia.hidden = true;
  historialWrap.hidden = false;
  historialTbody.innerHTML = '';

  for (const venta of filtradas) {
    const tr = document.createElement('tr');

    const tdFecha = document.createElement('td');
    tdFecha.textContent = fechaCorta(venta.createdAt);

    const tdComprador = document.createElement('td');
    tdComprador.textContent = venta.buyerName || 'Consumidor final';

    const tdMonto = document.createElement('td');
    tdMonto.textContent = money(venta.total);

    const tdEstado = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `estado-badge estado-badge--${venta.status}`;
    badge.textContent = ETIQUETA_ESTADO[venta.status] || venta.status;
    tdEstado.appendChild(badge);

    const tdTicket = document.createElement('td');
    const linkTicket = document.createElement('a');
    linkTicket.href = `/ticket.html?venta=${venta.id}`;
    linkTicket.target = '_blank';
    linkTicket.className = 'icon-btn';
    linkTicket.textContent = 'Ver ticket';
    tdTicket.appendChild(linkTicket);

    tr.append(tdFecha, tdComprador, tdMonto, tdEstado, tdTicket);
    historialTbody.appendChild(tr);
  }
};

historialBuscar.addEventListener('input', renderHistorial);

// ---------- Carga general ----------

const renderizarTabActual = () => {
  if (tabActual === 'activas') renderActivas();
  else if (tabActual === 'anuladas') renderAnuladas();
  else renderHistorial();
};

const cargarTodasLasVentas = async () => {
  tablaLoading.hidden = false;
  tablaError.hidden = true;

  try {
    const res = await fetch('/api/sales');
    if (!res.ok) throw new Error('Respuesta no exitosa');

    ventasCache = await res.json();
    tablaLoading.hidden = true;
    renderizarTabActual();

  } catch (error) {
    console.error('Error cargando ventas:', error);
    tablaLoading.hidden = true;
    tablaError.hidden = false;
  }
};

// ============================================================
// Popup: detalle de una venta activa
// ============================================================

const detalleOverlay = document.getElementById('detalle-overlay');
const detalleCloseBtn = document.getElementById('detalle-close-btn');
const detalleTitle = document.getElementById('detalle-title');
const detalleFecha = document.getElementById('detalle-fecha');
const detalleFeedback = document.getElementById('detalle-feedback');
const detalleComprador = document.getElementById('detalle-comprador');
const detalleTelefono = document.getElementById('detalle-telefono');
const detalleDireccion = document.getElementById('detalle-direccion');
const detalleMetodoPago = document.getElementById('detalle-metodo-pago');
const detalleObservaciones = document.getElementById('detalle-observaciones');
const detalleItems = document.getElementById('detalle-items');
const detalleTotal = document.getElementById('detalle-total');
const detalleTicketBtn = document.getElementById('detalle-ticket-btn');
const detalleEntregarBtn = document.getElementById('detalle-entregar-btn');
const detalleAnularBtn = document.getElementById('detalle-anular-btn');

let ventaEnDetalle = null;

const abrirDetalle = (ventaId) => {
  const venta = ventasCache.find((v) => v.id === ventaId);
  if (!venta) return;

  ventaEnDetalle = venta;
  detalleFeedback.hidden = true;

  detalleTitle.textContent = `Venta #${venta.id}`;
  detalleFecha.textContent = fechaCorta(venta.createdAt);
  detalleComprador.textContent = venta.buyerName || 'Consumidor final';
  detalleTelefono.textContent = venta.buyerPhone || '—';
  detalleDireccion.textContent = venta.deliveryAddress || '—';
  detalleMetodoPago.textContent = venta.paymentMethod || '—';
  detalleObservaciones.textContent = venta.notes || '—';
  detalleTotal.textContent = money(venta.total);
  detalleTicketBtn.href = `/ticket.html?venta=${venta.id}`;

  detalleItems.innerHTML = '';
  for (const item of venta.items) {
    const tr = document.createElement('tr');
    const variante = [item.productSize, item.productColor].filter(Boolean).join(' / ');
    const nombre = variante ? `${item.productName} (${variante})` : item.productName;

    const tdProducto = document.createElement('td');
    tdProducto.textContent = nombre;
    const tdCantidad = document.createElement('td');
    tdCantidad.textContent = item.quantity;
    const tdSubtotal = document.createElement('td');
    tdSubtotal.textContent = money(item.subtotal);

    tr.append(tdProducto, tdCantidad, tdSubtotal);
    detalleItems.appendChild(tr);
  }

  detalleOverlay.hidden = false;
};

const cerrarDetalle = () => {
  detalleOverlay.hidden = true;
  ventaEnDetalle = null;
};

detalleCloseBtn.addEventListener('click', cerrarDetalle);
detalleOverlay.addEventListener('click', (event) => {
  if (event.target === detalleOverlay) cerrarDetalle();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !detalleOverlay.hidden) cerrarDetalle();
});

detalleEntregarBtn.addEventListener('click', async () => {
  if (!ventaEnDetalle) return;

  const confirmado = confirm(`¿Marcar la venta #${ventaEnDetalle.id} como entregada?`);
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/sales/${ventaEnDetalle.id}/entregar`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      detalleFeedback.textContent = data.error || 'No se pudo marcar como entregada.';
      detalleFeedback.className = 'feedback feedback--error';
      detalleFeedback.hidden = false;
      return;
    }

    cerrarDetalle();
    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error marcando entregada:', error);
    detalleFeedback.textContent = 'No se pudo conectar con el servidor.';
    detalleFeedback.className = 'feedback feedback--error';
    detalleFeedback.hidden = false;
  }
});

detalleAnularBtn.addEventListener('click', async () => {
  if (!ventaEnDetalle) return;

  const confirmado = confirm(
    `¿Anular la venta #${ventaEnDetalle.id} por ${money(ventaEnDetalle.total)}? El stock de sus productos vuelve a sumarse.`
  );
  if (!confirmado) return;

  try {
    const res = await fetch(`/api/sales/${ventaEnDetalle.id}/cancel`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      detalleFeedback.textContent = data.error || 'No se pudo anular la venta.';
      detalleFeedback.className = 'feedback feedback--error';
      detalleFeedback.hidden = false;
      return;
    }

    cerrarDetalle();
    await cargarProductos();
    cargarTodasLasVentas();

  } catch (error) {
    console.error('Error anulando venta:', error);
    detalleFeedback.textContent = 'No se pudo conectar con el servidor.';
    detalleFeedback.className = 'feedback feedback--error';
    detalleFeedback.hidden = false;
  }
});

// ============================================================
// Arranque
// ============================================================

cargarProductos();
cargarTodasLasVentas();
renderCarrito();
