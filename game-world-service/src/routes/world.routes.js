const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/world.controller');

router.get('/countries', ctrl.getCountries);
router.get('/map/:mapId', ctrl.getMapConfig);

module.exports = router;
