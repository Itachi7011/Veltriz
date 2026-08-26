const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/marina.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/catalog', ctrl.listCatalog);
router.get('/my', ctrl.getMyVehicles);
router.post('/buy', ctrl.buyVehicle);
router.post('/sell', ctrl.sellVehicle);

module.exports = router;
