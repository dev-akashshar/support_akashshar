const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');

router.get('/tickets', auth, ticketController.index);
router.post('/tickets', auth, ticketController.store);
router.get('/tickets/:ticket', auth, ticketController.show);
router.put('/tickets/:ticket', auth, ticketController.update);
router.delete('/tickets/:ticket', auth, ticketController.destroy);

router.get('/tickets/:ticket/sync', auth, ticketController.sync);
router.post('/tickets/:ticket/replies', auth, ticketController.addReply);
router.post('/tickets/:ticket/notes', auth, ticketController.addNote);
router.post('/tickets/:ticket/assign', auth, ticketController.assign);
router.post('/tickets/:ticket/status', auth, ticketController.updateStatus);
router.post('/tickets/:ticket/priority', auth, ticketController.updatePriority);
router.post('/tickets/:ticket/close', auth, ticketController.close);
router.post('/tickets/:ticket/reopen', auth, ticketController.reopen);

module.exports = router;
