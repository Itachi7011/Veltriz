const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/users.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUserDetail);
router.post('/:id/status', ctrl.setUserStatus);
router.post('/:id/unlock', ctrl.unlockUser);

module.exports = router;
