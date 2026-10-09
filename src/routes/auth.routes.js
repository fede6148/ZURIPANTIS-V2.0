// routes/auth.routes.js
import { Router } from 'express';
import { login, changePassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.put('/change-password', verifyToken, changePassword);

export default router;
