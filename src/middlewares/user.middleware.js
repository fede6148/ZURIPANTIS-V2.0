// src/middlewares/user.middleware.js
// Valida los datos del body antes de que lleguen al controlador.

// Importamos express-validator para validar los datos
export const validateUser = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Los campos name, email y password son obligatorios'
    });
  }

  if (typeof name !== 'string') {
    return res.status(400).json({
      error: 'El nombre debe ser un string'
    });
  }

  // Validamos el formato del email y la complejidad de la contraseña
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'El email no tiene un formato válido'
    });
  }

  // Validamos la complejidad de la contraseña: al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo
  // Explicación de la regex:
  // ^                         : inicio de la cadena
  // (?=.*[a-z])               : al menos una letra minúscula
  // (?=.*[A-Z])               : al menos una letra mayúscula
  // (?=.*\d)                  : al menos un dígito
  // (?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]) : al menos un símbolo especial
  // .{8,}                     : al menos 8 caracteres
  // $                         : fin de la cadena
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo'
    });
  }

  next();
};