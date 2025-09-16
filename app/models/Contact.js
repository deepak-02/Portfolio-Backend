import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    message: { type: String, required: true },
    date: { type: String, required: true }, // e.g. 02 June 2025 (Monday)
    time: { type: String, required: true }, // e.g. 12:00 AM
});

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    messages: [messageSchema],
    to: { type: String, default: ""}
});

export default mongoose.model('Contact', contactSchema); 
