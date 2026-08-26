const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/market.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimiter');
const { buySellSchema, useItemSchema } = require('../validators/economy.validators');

router.get('/', ctrl.listMarket);
router.get('/inventory', protect, ctrl.getInventory);
router.post('/buy', protect, actionLimiter, validate(buySellSchema), ctrl.buyItem);
router.post('/sell', protect, actionLimiter, validate(buySellSchema), ctrl.sellItem);
router.post('/use', protect, actionLimiter, validate(useItemSchema), ctrl.useItem);

module.exports = router;
