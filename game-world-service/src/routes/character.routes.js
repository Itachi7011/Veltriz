const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/character.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createCharacterSchema, savePositionSchema } = require('../validators/character.validators');

router.post('/', protect, validate(createCharacterSchema), ctrl.createCharacter);
router.get('/me', protect, ctrl.getMyCharacter);
router.patch('/position', protect, validate(savePositionSchema), ctrl.savePosition);
router.post('/relax', protect, ctrl.relaxAtPark);
router.post('/gym', protect, ctrl.workoutAtGym);
router.post('/cinema', protect, ctrl.watchMovieAtCinema);
router.post('/relocate', protect, ctrl.relocate);

module.exports = router;
