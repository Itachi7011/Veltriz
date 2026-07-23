const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/character.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createCharacterSchema, savePositionSchema } = require('../validators/character.validators');

router.post('/', protect, validate(createCharacterSchema), ctrl.createCharacter);
router.get('/me', protect, ctrl.getMyCharacter);
router.patch('/position', protect, validate(savePositionSchema), ctrl.savePosition);

module.exports = router;
