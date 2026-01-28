import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cartController.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/', protect, addToCart);
router.delete('/item/:itemId', protect, removeFromCart);
router.delete('/', protect, clearCart);

export default router;
