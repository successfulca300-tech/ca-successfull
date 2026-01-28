import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['course', 'book', 'testseries'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String },
  thumbnail: { type: String },
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
}, { _id: false });

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [CartItemSchema],
}, { timestamps: true });

export default mongoose.model('Cart', CartSchema);
