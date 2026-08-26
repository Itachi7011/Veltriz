const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/creditunion.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', ctrl.getMyLoan);
router.post('/borrow', ctrl.borrow);
router.post('/repay', ctrl.repay);

module.exports = router;
