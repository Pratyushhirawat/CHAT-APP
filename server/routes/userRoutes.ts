import { Router } from "express";
import { getProfile, getUsers, searchUsers, updateProfile } from "../controllers/userController.js";
import upload from "../middlewares/upload.js";
import { authMiddleware } from "../middlewares/auth.js";

const userRouter = Router();

userRouter.get('/', getUsers)
userRouter.get('/search', searchUsers)
userRouter.get('/profile',authMiddleware, getProfile)
userRouter.get('/profile', upload.single("avatar"),authMiddleware, updateProfile)

export default userRouter;