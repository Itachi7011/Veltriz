const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/realestate.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/listings', ctrl.listAvailable);
router.get('/my', ctrl.getMyHouses);
router.post('/buy', ctrl.buyHouse);
router.post('/sell', ctrl.sellHouse);

module.exports = router;
