const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internalAuth.middleware');
const validate = require('../middleware/validate');
const {
  adminAdjustPriceSchema,
  adminWalletAdjustSchema,
  adminUpsertJobSchema,
  adminUpsertMarketItemSchema,
  adminUpsertPaymentProductSchema,
} = require('../validators/economy.validators');

// Every route here requires the shared internal API key — see
// middleware/internalAuth.middleware.js. admin-service is the only caller.
router.use(internalAuth);

router.get('/overview', ctrl.getOverview);

router.get('/wallets', ctrl.listWallets);
router.get('/wallets/:userId', ctrl.getWalletByUserId);
router.post('/wallets/:userId/credit', validate(adminWalletAdjustSchema), ctrl.adminCreditWallet);
router.post('/wallets/:userId/debit', validate(adminWalletAdjustSchema), ctrl.adminDebitWallet);
router.post('/wallets/:userId/debit-shards', validate(adminWalletAdjustSchema), ctrl.debitShardsInternal);
router.post('/wallets/:userId/credit-shards', validate(adminWalletAdjustSchema), ctrl.creditShardsInternal);
router.post('/wallets/:userId/lock', ctrl.lockWallet);
router.post('/wallets/:userId/unlock', ctrl.unlockWallet);

router.get('/jobs', ctrl.listJobsAdmin);
router.post('/jobs', validate(adminUpsertJobSchema), ctrl.upsertJob);

router.get('/market-items', ctrl.listMarketItemsAdmin);
router.post('/market-items', validate(adminUpsertMarketItemSchema), ctrl.upsertMarketItem);
router.post('/market-items/adjust-price', validate(adminAdjustPriceSchema), ctrl.adjustPrice);

router.get('/payment-products', ctrl.listPaymentProductsAdmin);
router.post('/payment-products', validate(adminUpsertPaymentProductSchema), ctrl.upsertPaymentProduct);
router.get('/payment-transactions', ctrl.listPaymentTransactionsAdmin);

router.get('/inventory/:userId/has-weapon', ctrl.hasWeapon);

module.exports = router;
