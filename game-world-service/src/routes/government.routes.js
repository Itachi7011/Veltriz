const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/government.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', ctrl.getStatus);
router.post('/file', ctrl.fileAsCandidate);
router.post('/vote', ctrl.vote);
router.patch('/policy', ctrl.setPolicy);

module.exports = router;
