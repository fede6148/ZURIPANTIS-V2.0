// src/middlewares/sale.middleware.js
// Valida el body de una venta: un array "items" con al menos un
// producto, y opcionalmente buyerName/deliveryAddress/notes (texto).

export const validateSale = (req, res, next) => {
  const { items, buyerName, deliveryAddress, notes, buyerPhone, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'La venta necesita al menos un producto (items no puede estar vacío)'
    });
  }

  for (const item of items) {
    const { productId, quantity } = item || {};

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Cada ítem necesita productId y quantity' });
    }
    if (typeof productId !== 'number') {
      return res.status(400).json({ error: 'productId debe ser numérico' });
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'quantity debe ser un número entero' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'quantity debe ser mayor a 0' });
    }
  }

  const camposTexto = { buyerName, deliveryAddress, notes, buyerPhone, paymentMethod };
  for (const [campo, valor] of Object.entries(camposTexto)) {
    if (valor !== undefined && valor !== null && typeof valor !== 'string') {
      return res.status(400).json({ error: `${campo} debe ser texto` });
    }
  }

  next();
};
