import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.js';

dotenv.config({ path: './backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const book = await Book.findOne({ fileUrl: { $exists: true, $ne: null } });
    console.log(book ? book.toObject() : 'No book with fileUrl found');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
