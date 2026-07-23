const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/public.controller');

router.get('/news', ctrl.listNews);
router.get('/events/active', ctrl.listActiveEvents);
router.get('/npcs/summary', ctrl.getNpcSummary);

module.exports = router;
