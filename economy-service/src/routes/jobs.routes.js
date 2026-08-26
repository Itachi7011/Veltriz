const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/jobs.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimiter');
const { applyJobSchema } = require('../validators/economy.validators');

router.get('/', ctrl.listJobs);
router.get('/me', protect, ctrl.getMyEmployment);
router.post('/apply', protect, actionLimiter, validate(applyJobSchema), ctrl.applyToJob);
router.post('/work/start', protect, actionLimiter, ctrl.startShift);
router.post('/work/collect', protect, actionLimiter, ctrl.collectShift);
router.post('/work/rush', protect, actionLimiter, ctrl.rushShift);
router.get('/work/rush-cost', protect, ctrl.getRushCost);
router.post('/promote', protect, actionLimiter, ctrl.promoteJob);
router.post('/quit', protect, actionLimiter, ctrl.quitJob);

module.exports = router;
