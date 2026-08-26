const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/economy.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/overview', ctrl.getOverview);

router.get('/wallets', ctrl.listWallets);
router.post('/wallets/:userId/credit', ctrl.creditWallet);
router.post('/wallets/:userId/debit', ctrl.debitWallet);
router.post('/wallets/:userId/credit-shards', ctrl.creditWalletShards);
router.post('/wallets/:userId/debit-shards', ctrl.debitWalletShards);
router.post('/wallets/:userId/lock', ctrl.lockWallet);
router.post('/wallets/:userId/unlock', ctrl.unlockWallet);

router.get('/jobs', ctrl.listJobs);
router.post('/jobs', ctrl.upsertJob);

router.get('/market-items', ctrl.listMarketItems);
router.post('/market-items', ctrl.upsertMarketItem);
router.post('/market-items/adjust-price', ctrl.adjustPrice);

router.get('/payment-products', ctrl.listPaymentProducts);
router.post('/payment-products', ctrl.upsertPaymentProduct);
router.get('/payment-transactions', ctrl.listPaymentTransactions);

module.exports = router;
