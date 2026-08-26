const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/crime.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimiter');
const { attemptCrimeSchema } = require('../validators/crime.validators');

router.use(protect);

router.get('/actions', ctrl.listActions);
router.get('/me', ctrl.getMyStatus);
router.post('/attempt', actionLimiter, validate(attemptCrimeSchema), ctrl.attemptCrime);
router.post('/rush-cooldown', actionLimiter, ctrl.rushCooldown);
router.get('/rush-cost/:actionKey', ctrl.getRushCost);
router.post('/pay-fine', actionLimiter, ctrl.payFine);
router.post('/contest-fine', actionLimiter, ctrl.contestFine);

module.exports = router;
