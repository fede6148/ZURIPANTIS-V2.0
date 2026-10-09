// src/models/sales.model.js
// Acceso a datos para ventas.
//
// Estados de una venta (columna status):
//   'completed' -> venta activa, recién registrada (aparece en "Últimas ventas")
//   'delivered' -> ya se le entregó al comprador (sale de "Últimas ventas",
//                  queda solo en "Historial de ventas")
//   'cancelled' -> anulada, reversible (aparece en "Ventas anuladas";
//                  el stock de sus ítems ya fue devuelto)
//   'closed'    -> anulación definitiva ("Eliminar compra"): ya no se
//                  puede reactivar, sale de "Ventas anuladas" pero sigue
//                  visible en "Historial de ventas".
//
// Cada ítem de una venta (sale_items) guarda su propia "foto" del
// producto (nombre, talle, color) tal como era al momento de venderse.
// Por eso borrar un producto NUNCA depende de si tuvo ventas: el
// historial y los tickets se siguen viendo bien aunque el producto ya
// no exista (product_id queda en NULL en ese caso, ver
// products.model.js). Lo único que sigue necesitando que el producto
// exista de verdad es "reactivar" una venta anulada, porque eso
// implica volver a descontar stock real — ver reactivarVentaModel.

import db, { transaction } from '../config/database.js';

const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');

const insertSaleStmt = db.prepare(`
  INSERT INTO sales (total, buyer_name, delivery_address, notes, buyer_phone, payment_method)
  VALUES ($total, $buyerName, $deliveryAddress, $notes, $buyerPhone, $paymentMethod)
`);

const insertItemStmt = db.prepare(`
  INSERT INTO sale_items (sale_id, product_id, product_name, product_size, product_color, quantity, unit_price, subtotal)
  VALUES ($saleId, $productId, $productName, $productSize, $productColor, $quantity, $unitPrice, $subtotal)
`);

const deleteItemStmt = db.prepare('DELETE FROM sale_items WHERE id = ?');

const decreaseStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
const increaseStockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

const selectSaleStmt = db.prepare('SELECT * FROM sales WHERE id = ?');

const setStatusStmt = db.prepare('UPDATE sales SET status = ? WHERE id = ?');
const updateTotalStmt = db.prepare('UPDATE sales SET total = ? WHERE id = ?');

// Ya no hace JOIN con products: cada ítem trae su propia foto
// (product_name/size/color) guardada al momento de venderse, así que
// se ve bien sin importar si el producto sigue existiendo.
const selectItemsBySaleStmt = db.prepare(`
  SELECT
    id AS id,
    product_id AS productId,
    product_name AS productName,
    product_size AS productSize,
    product_color AS productColor,
    quantity AS quantity,
    unit_price AS unitPrice,
    subtotal AS subtotal
  FROM sale_items
  WHERE sale_id = ?
  ORDER BY id ASC
`);

// Junta varios ítems del mismo producto en uno solo, sumando cantidades.
const consolidarItems = (items) => {
  const porProducto = new Map();

  for (const { productId, quantity } of items) {
    const actual = porProducto.get(productId) || 0;
    porProducto.set(productId, actual + quantity);
  }

  return Array.from(porProducto.entries()).map(([productId, quantity]) => ({
    productId,
    quantity
  }));
};

const armarSale = (saleId) => {
  const sale = selectSaleStmt.get(saleId);
  const items = selectItemsBySaleStmt.all(saleId);

  return {
    id: sale.id,
    createdAt: sale.created_at,
    total: sale.total,
    status: sale.status,
    buyerName: sale.buyer_name,
    deliveryAddress: sale.delivery_address,
    notes: sale.notes,
    buyerPhone: sale.buyer_phone,
    paymentMethod: sale.payment_method,
    items
  };
};

// Valida stock y trae los datos del producto (para la foto congelada)
// de una lista de productId/quantity ya consolidada. Lanza
// 'PRODUCTO_NO_ENCONTRADO' o 'STOCK_INSUFICIENTE' si corresponde.
// No toca la base: solo calcula, para reutilizar tanto al crear como
// al reactivar una venta.
const validarYArmarItems = (itemsConsolidados) => {
  let total = 0;
  const itemsAProcesar = [];

  for (const { productId, quantity } of itemsConsolidados) {
    const product = getProductStmt.get(productId);

    if (!product) {
      const error = new Error('PRODUCTO_NO_ENCONTRADO');
      error.detalle = `Producto con id ${productId} no existe`;
      throw error;
    }

    if (product.stock < quantity) {
      const error = new Error('STOCK_INSUFICIENTE');
      error.detalle = `${product.name}: pediste ${quantity}, hay ${product.stock} en stock`;
      throw error;
    }

    const subtotal = Number((product.price * quantity).toFixed(2));
    total += subtotal;

    itemsAProcesar.push({
      productId,
      quantity,
      unitPrice: product.price,
      subtotal,
      productName: product.name,
      productSize: product.size,
      productColor: product.color
    });
  }

  return { total: Number(total.toFixed(2)), itemsAProcesar };
};

// función POST para crear una venta con uno o más ítems.
export const createSaleModel = async (items, datosVenta = {}) => {
  const itemsConsolidados = consolidarItems(items);

  const saleId = transaction(() => {
    const { total, itemsAProcesar } = validarYArmarItems(itemsConsolidados);

    const saleResult = insertSaleStmt.run({
      $total: total,
      $buyerName: datosVenta.buyerName || null,
      $deliveryAddress: datosVenta.deliveryAddress || null,
      $notes: datosVenta.notes || null,
      $buyerPhone: datosVenta.buyerPhone || null,
      $paymentMethod: datosVenta.paymentMethod || null
    });
    const nuevoSaleId = saleResult.lastInsertRowid;

    for (const item of itemsAProcesar) {
      insertItemStmt.run({
        $saleId: nuevoSaleId,
        $productId: item.productId,
        $productName: item.productName,
        $productSize: item.productSize,
        $productColor: item.productColor,
        $quantity: item.quantity,
        $unitPrice: item.unitPrice,
        $subtotal: item.subtotal
      });
      decreaseStockStmt.run(item.quantity, item.productId);
    }

    return nuevoSaleId;
  });

  return armarSale(saleId);
};

// función GET para listar todas las ventas (más recientes primero),
// cada una con sus ítems y su estado. El filtrado por pestaña
// (activas/anuladas/historial) se hace en el frontend.
export const getAllSalesModel = async () => {
  const ventas = db.prepare('SELECT id FROM sales ORDER BY id DESC').all();
  return ventas.map((v) => armarSale(v.id));
};

// función GET para obtener una venta por id, con sus ítems.
export const getSaleByIdModel = async (id) => {
  const sale = selectSaleStmt.get(id);
  if (!sale) return null;

  return armarSale(id);
};

// Anula una venta activa: devuelve el stock de sus ítems (a los
// productos que todavía existan; si alguno ya se borró, no hay a
// dónde devolverlo y sencillamente se omite) y la marca 'cancelled'.
export const cancelSaleModel = async (id) => {
  const sale = selectSaleStmt.get(id);
  if (!sale) return null;

  if (sale.status !== 'completed') {
    const error = new Error('TRANSICION_INVALIDA');
    error.detalle =
      sale.status === 'cancelled'
        ? 'Esta venta ya está anulada'
        : 'Esta venta ya fue entregada, no se puede anular';
    throw error;
  }

  transaction(() => {
    const items = selectItemsBySaleStmt.all(id);
    for (const item of items) {
      if (item.productId !== null) {
        increaseStockStmt.run(item.quantity, item.productId);
      }
    }
    setStatusStmt.run('cancelled', id);
  });

  return armarSale(id);
};

// Marca una venta activa como entregada. Sale de "Últimas ventas",
// queda en "Historial de ventas". No toca el stock (ya estaba
// descontado desde que se registró la venta).
export const marcarEntregadaModel = async (id) => {
  const sale = selectSaleStmt.get(id);
  if (!sale) return null;

  if (sale.status !== 'completed') {
    const error = new Error('TRANSICION_INVALIDA');
    error.detalle = 'Solo se puede marcar como entregada una venta activa';
    throw error;
  }

  setStatusStmt.run('delivered', id);
  return armarSale(id);
};

// Reactiva una venta anulada: vuelve a 'completed' y descuenta stock
// de nuevo. Si alguno de sus productos ya no existe en el catálogo
// (fue eliminado mientras la venta estaba anulada), ESE ítem se saca
// de la venta —ya no tiene sentido volver a venderlo— y se informa
// cuáles se sacaron; el resto se reactiva normalmente. Si no queda
// ningún ítem con producto real, se lanza 'SIN_PRODUCTOS_VALIDOS' y
// no se cambia nada (la venta sigue anulada).
export const reactivarVentaModel = async (id) => {
  const sale = selectSaleStmt.get(id);
  if (!sale) return null;

  if (sale.status !== 'cancelled') {
    const error = new Error('TRANSICION_INVALIDA');
    error.detalle = 'Solo se puede reactivar una venta anulada';
    throw error;
  }

  let itemsRemovidos = [];

  transaction(() => {
    const items = selectItemsBySaleStmt.all(id);

    const itemsConProducto = items.filter((item) => item.productId !== null);
    const itemsSinProducto = items.filter((item) => item.productId === null);

    if (itemsConProducto.length === 0) {
      const error = new Error('SIN_PRODUCTOS_VALIDOS');
      error.detalle =
        'Ningún producto de esta venta existe ya en el catálogo, no se puede reactivar.';
      throw error;
    }

    // Revalida stock disponible al momento de reactivar (puede haber
    // cambiado desde que se anuló la venta).
    const itemsConsolidados = itemsConProducto.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    }));
    validarYArmarItems(itemsConsolidados);

    // Los ítems cuyo producto ya no existe se sacan de la venta
    // (ya no se pueden volver a vender) y se informan al final.
    for (const item of itemsSinProducto) {
      deleteItemStmt.run(item.id);
      itemsRemovidos.push(item.productName);
    }

    for (const item of itemsConProducto) {
      decreaseStockStmt.run(item.quantity, item.productId);
    }

    const nuevoTotal = Number(
      itemsConProducto.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
    );
    updateTotalStmt.run(nuevoTotal, id);

    setStatusStmt.run('completed', id);
  });

  return { ...armarSale(id), itemsRemovidos };
};

// "Eliminar compra": cierra definitivamente una venta anulada. No se
// borra de la base (para no perder el historial) pero sale de la
// lista activa de "Ventas anuladas" y ya no se puede reactivar.
export const finalizarCancelacionModel = async (id) => {
  const sale = selectSaleStmt.get(id);
  if (!sale) return null;

  if (sale.status !== 'cancelled') {
    const error = new Error('TRANSICION_INVALIDA');
    error.detalle = 'Solo se puede eliminar una compra que esté anulada';
    throw error;
  }

  setStatusStmt.run('closed', id);
  return armarSale(id);
};

// Arma la lista plana de ventas (todas, cualquier estado) lista para
// exportar a Excel: una fila por venta, con el detalle de productos
// resumido en una sola columna de texto.
export const obtenerVentasParaExportar = async () => {
  const ventas = await getAllSalesModel();

  return ventas.map((venta) => ({
    id: venta.id,
    fecha: venta.createdAt,
    comprador: venta.buyerName || 'Consumidor final',
    telefono: venta.buyerPhone || '',
    direccion: venta.deliveryAddress || '',
    metodoPago: venta.paymentMethod || '',
    observaciones: venta.notes || '',
    estado:
      { completed: 'Activa', delivered: 'Entregada', cancelled: 'Anulada', closed: 'Cancelada' }[
        venta.status
      ] || venta.status,
    total: venta.total,
    productos: venta.items
      .map((item) => `${item.quantity} x ${item.productName}`)
      .join('; ')
  }));
};
