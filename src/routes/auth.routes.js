const express = require('express');
const userService = require('../services/user.service');
const { validarCredenciales } = require('../utils/validators');
const { autenticar, autorizar } = require('../middleware/auth');

const router = express.Router();

router.post('/registro', (req, res, next) => {
  const errores = validarCredenciales(req.body);
  if (errores.length) return res.status(400).json({ errores });
  try {
    return res.status(201).json(userService.registrar(req.body));
  } catch (err) {
    return next(err);
  }
});

router.post('/login', (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password son obligatorios' });
  try {
    return res.json(userService.login({ email, password }));
  } catch (err) {
    return next(err);
  }
});

router.patch('/usuarios/:id/rol', autenticar, autorizar('admin'), (req, res, next) => {
  try {
    return res.json(userService.cambiarRol(Number(req.params.id), req.body?.rol));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
