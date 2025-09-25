const express = require('express');
const goalsController = require('../controllers/goalsController');

const router = express.Router();

router.get('/', goalsController.listGoals);
router.post('/', goalsController.createGoal);
router.put('/:id', goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);

module.exports = router;
