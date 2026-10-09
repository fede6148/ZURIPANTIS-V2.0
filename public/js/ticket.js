// public/js/ticket.js
// Trae una venta por id (?venta=ID en la URL) y arma el ticket imprimible.

const money = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value || 0);

const fechaLarga = (fechaISO) =>
  new Date(fechaISO.replace(' ', 'T') + 'Z').toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const params = new URLSearchParams(window.location.search);
const ventaId = params.get('venta');

const elLoading = document.getElementById('ticket-loading');
const elError = document.getElementById('ticket-error');
const elTicket = document.getElementById('ticket');

const cargarTicket = async () => {
  if (!ventaId) {
    elLoading.hidden = true;
    elError.hidden = false;
    elError.textContent = 'Falta indicar qué venta mostrar.';
    return;
  }

  try {
    const res = await fetch(`/api/sales/${ventaId}`);
    if (!res.ok) throw new Error('Venta no encontrada');

    const venta = await res.json();

    document.getElementById('ticket-id').textContent = venta.id;
    document.getElementById('ticket-fecha').textContent = fechaLarga(venta.createdAt);
    document.getElementById('ticket-total').textContent = money(venta.total);

    if (venta.buyerName || venta.deliveryAddress) {
      document.getElementById('ticket-comprador').textContent = venta.buyerName || 'Consumidor final';
      document.getElementById('ticket-telefono').textContent = venta.buyerPhone ? `Tel: ${venta.buyerPhone}` : '';
      document.getElementById('ticket-direccion').textContent = venta.deliveryAddress || '';
      document.getElementById('ticket-comprador-bloque').hidden = false;
    }

    if (venta.status === 'cancelled' || venta.status === 'closed') {
      const aviso = document.createElement('p');
      aviso.textContent = '*** VENTA ANULADA ***';
      aviso.style.textAlign = 'center';
      aviso.style.color = '#e8112d';
      aviso.style.fontWeight = '700';
      aviso.style.margin = '0 0 14px';
      document.getElementById('ticket-fecha').insertAdjacentElement('afterend', aviso);
    }

    const tbody = document.getElementById('ticket-items');
    tbody.innerHTML = '';

    for (const item of venta.items) {
      const tr = document.createElement('tr');

      const tdProducto = document.createElement('td');
      const variante = [item.productSize, item.productColor].filter(Boolean).join(' / ');
      tdProducto.textContent = variante ? `${item.productName} (${variante})` : item.productName;

      const tdCantidad = document.createElement('td');
      tdCantidad.textContent = item.quantity;

      const tdSubtotal = document.createElement('td');
      tdSubtotal.textContent = money(item.subtotal);

      tr.appendChild(tdProducto);
      tr.appendChild(tdCantidad);
      tr.appendChild(tdSubtotal);
      tbody.appendChild(tr);
    }

    elLoading.hidden = true;
    elTicket.hidden = false;

  } catch (error) {
    console.error('Error cargando el ticket:', error);
    elLoading.hidden = true;
    elError.hidden = false;
  }
};

document.getElementById('imprimir-btn').addEventListener('click', () => window.print());

cargarTicket();
