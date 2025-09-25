const express = require('express');
const transactionsController = require('../controllers/transactionsController');

const router = express.Router();

router.get('/', transactionsController.listTransactions);
router.post('/', transactionsController.createTransaction);
router.delete('/:id', transactionsController.deleteTransaction);
router.put('/:id', transactionsController.updateTransaction);

module.exports = router;
