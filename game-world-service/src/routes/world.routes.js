const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/world.controller');

router.get('/countries', ctrl.getCountries);
router.get('/map/:mapId', ctrl.getMapConfig);
router.get('/clock', ctrl.getClock);

module.exports = router;
