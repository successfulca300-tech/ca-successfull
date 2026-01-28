import mongoose from 'mongoose';

const orderRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  amount: { type: Number, default: 0 },
  message: { type: String },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  adminComment: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);
export default OrderRequest;
