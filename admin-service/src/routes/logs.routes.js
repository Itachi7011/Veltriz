const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/logs.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/players', ctrl.listPlayerLogs);
router.get('/admin', ctrl.listAdminLogs);

module.exports = router;
