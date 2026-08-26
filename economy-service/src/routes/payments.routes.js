const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/payments.controller');
const { protect } = require('../middleware/auth.middleware');
const { actionLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { checkoutSchema } = require('../validators/economy.validators');

router.get('/products', ctrl.listProducts);
router.post('/checkout', protect, actionLimiter, validate(checkoutSchema), ctrl.checkout);
router.get('/history', protect, ctrl.getHistory);

module.exports = router;
