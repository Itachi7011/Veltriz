const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/world.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/events', ctrl.listEvents);
router.post('/events', ctrl.triggerEvent);
router.post('/events/:id/revert', ctrl.revertEvent);

router.get('/npcs/summary', ctrl.getNpcSummary);

router.get('/news', ctrl.listNews);

module.exports = router;
