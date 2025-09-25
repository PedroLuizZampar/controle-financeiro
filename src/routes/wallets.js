const express = require('express');
const walletsController = require('../controllers/walletsController');

const router = express.Router();

router.get('/', walletsController.listWallets);
router.post('/', walletsController.createWallet);
router.put('/:id', walletsController.updateWallet);
router.delete('/:id', walletsController.deleteWallet);

module.exports = router;
