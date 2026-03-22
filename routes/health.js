'use strict';
const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status:   'ok',
    uptime:   process.uptime().toFixed(1) + 's',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ts:       new Date().toISOString(),
  });
});

module.exports = router;
