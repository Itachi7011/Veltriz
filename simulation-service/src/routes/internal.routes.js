const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internalAuth.middleware');
const validate = require('../middleware/validate');
const { triggerEventSchema } = require('../validators/events.validators');

router.use(internalAuth);

router.get('/events', ctrl.listAllEvents);
router.post('/events', validate(triggerEventSchema), ctrl.triggerEvent);
router.post('/events/:id/revert', ctrl.forceRevertEvent);

module.exports = router;
