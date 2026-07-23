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
router.post('/work', protect, actionLimiter, ctrl.workShift);
router.post('/quit', protect, actionLimiter, ctrl.quitJob);

module.exports = router;
