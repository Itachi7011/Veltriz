const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/casino.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimiter');
const { casinoBetSchema } = require('../validators/economy.validators');

router.use(protect);

router.get('/me', ctrl.getMyStatus);
router.post('/bet', actionLimiter, validate(casinoBetSchema), ctrl.placeBet);

module.exports = router;
