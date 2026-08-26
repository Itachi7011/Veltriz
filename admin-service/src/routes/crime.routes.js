const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/crime.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/actions', ctrl.listActions);
router.post('/actions', ctrl.upsertAction);

router.get('/heat', ctrl.listHeat);
router.post('/heat/:userId/reset', ctrl.resetHeat);

module.exports = router;
