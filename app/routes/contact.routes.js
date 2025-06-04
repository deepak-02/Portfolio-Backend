import express from 'express';
import { submitContactForm } from '../controller/contactController.js';

const router = express.Router();

router.post('/mail', submitContactForm);

export default router; 