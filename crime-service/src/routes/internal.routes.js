const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internalAuth.middleware');
const validate = require('../middleware/validate');
const { adminUpsertCrimeActionSchema } = require('../validators/crime.validators');

// Every route here requires the shared internal API key — see
// middleware/internalAuth.middleware.js. admin-service is the only caller.
router.use(internalAuth);

router.get('/actions', ctrl.listActionsAdmin);
router.post('/actions', validate(adminUpsertCrimeActionSchema), ctrl.upsertAction);

router.get('/heat', ctrl.listHeat);
router.post('/heat/:userId/reset', ctrl.resetHeat);

module.exports = router;
