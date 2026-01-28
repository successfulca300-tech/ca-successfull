import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import { createOrderRequest, listOrderRequests, resolveOrderRequest, listUserRequests } from '../controllers/orderRequestController.js';

const router = express.Router();

router.post('/', protect, createOrderRequest);
router.get('/me', protect, listUserRequests);
router.get('/', protect, admin, listOrderRequests);
router.put('/:id/resolve', protect, admin, resolveOrderRequest);

export default router;
