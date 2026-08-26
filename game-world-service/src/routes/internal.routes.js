const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internalAuth.middleware');

router.use(internalAuth);

router.post('/character/:userId/stats', ctrl.adjustStats);
router.get('/government', ctrl.getGovernmentPolicy);

module.exports = router;
