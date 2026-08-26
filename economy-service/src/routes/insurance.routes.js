const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/insurance.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', ctrl.getMyInsurance);
router.post('/subscribe', ctrl.subscribe);

module.exports = router;
