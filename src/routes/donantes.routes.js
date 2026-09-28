const express = require('express');
const donanteService = require('../services/donante.service');
const { validarDonante } = require('../utils/validators');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

router.use(autenticar);

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'id inválido' });
    return null;
  }
  return id;
}

// Usuarios y admins pueden registrar y consultar donantes
router.post('/', autorizar('admin', 'usuario'), (req, res, next) => {
  const errores = validarDonante(req.body);
  if (errores.length) return res.status(400).json({ errores });
  try {
    return res.status(201).json(donanteService.crear(req.body, req.usuario.sub));
  } catch (err) {
    return next(err);
  }
});

router.get('/', autorizar('admin', 'usuario'), (req, res) => {
  const buscar = typeof req.query.buscar === 'string' ? req.query.buscar : undefined;
  res.json(donanteService.listar({ usuario: req.usuario, buscar }));
});

router.get('/:id', autorizar('admin', 'usuario'), (req, res, next) => {
  const id = parseId(req, res);
  if (id === null) return undefined;
  try {
    const donante = donanteService.obtener(id);
    if (req.usuario.rol !== 'admin' && donante.registrado_por !== req.usuario.sub) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    return res.json(donante);
  } catch (err) {
    return next(err);
  }
});

// Solo administradores modifican o eliminan registros
router.put('/:id', autorizar('admin'), (req, res, next) => {
  const id = parseId(req, res);
  if (id === null) return undefined;
  const errores = validarDonante(req.body, { parcial: true });
  if (errores.length) return res.status(400).json({ errores });
  try {
    return res.json(donanteService.actualizar(id, req.body));
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', autorizar('admin'), (req, res, next) => {
  const id = parseId(req, res);
  if (id === null) return undefined;
  try {
    donanteService.eliminar(id);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
