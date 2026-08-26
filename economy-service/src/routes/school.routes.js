const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/school.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', ctrl.getMySkill);
router.post('/study', ctrl.study);

module.exports = router;
