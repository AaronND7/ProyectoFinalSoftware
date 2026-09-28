const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const TELEFONO_RE = /^\+?[0-9\s-]{7,20}$/;
const TIPOS_DONACION = ['monetaria', 'especie', 'sangre', 'voluntariado'];

// Elimina caracteres usados en inyección HTML/JS para mitigar XSS almacenado
function sanitizeText(value) {
  return String(value).replace(/[<>"'`]/g, '').trim();
}

function validarCredenciales({ email, password } = {}) {
  const errores = [];
  if (!email || !EMAIL_RE.test(email)) errores.push('email inválido');
  if (!password || String(password).length < 8) errores.push('password debe tener al menos 8 caracteres');
  return errores;
}

function validarDonante(data = {}, { parcial = false } = {}) {
  const errores = [];
  const has = (k) => data[k] !== undefined;

  if (!parcial || has('nombre')) {
    if (!data.nombre || sanitizeText(data.nombre).length < 2) errores.push('nombre es obligatorio (mín. 2 caracteres)');
  }
  if (!parcial || has('email')) {
    if (!data.email || !EMAIL_RE.test(data.email)) errores.push('email inválido');
  }
  if (has('telefono') && data.telefono !== null && !TELEFONO_RE.test(data.telefono)) {
    errores.push('telefono inválido');
  }
  if (!parcial || has('tipo_donacion')) {
    if (!TIPOS_DONACION.includes(data.tipo_donacion)) {
      errores.push(`tipo_donacion debe ser uno de: ${TIPOS_DONACION.join(', ')}`);
    }
  }
  if (has('monto') && data.monto !== null) {
    if (typeof data.monto !== 'number' || !Number.isFinite(data.monto) || data.monto < 0) {
      errores.push('monto debe ser un número positivo');
    }
  }
  return errores;
}

module.exports = { sanitizeText, validarCredenciales, validarDonante, TIPOS_DONACION };
