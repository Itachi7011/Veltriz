const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/lottery.controller');
const { protect } = require('../middleware/auth.middleware');
const { actionLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.get('/me', ctrl.getStatus);
router.post('/buy', actionLimiter, ctrl.buyTickets);

module.exports = router;
