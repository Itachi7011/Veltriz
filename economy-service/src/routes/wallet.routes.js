const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimiter');
const { initWalletSchema } = require('../validators/economy.validators');

router.post('/init', protect, actionLimiter, validate(initWalletSchema), ctrl.initWallet);
router.get('/me', protect, ctrl.getMyWallet);
router.get('/transactions', protect, ctrl.getTransactions);
router.get('/shard-transactions', protect, ctrl.getShardTransactions);

module.exports = router;
