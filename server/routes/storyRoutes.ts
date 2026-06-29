import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import upload from "../middlewares/upload.js";
import { createStory, getStories } from "../controllers/storyController.js";

const storyRouter = Router();

storyRouter.use(authMiddleware)

storyRouter.post('/', upload.single('file'), createStory)
storyRouter.get('/', getStories)

export default storyRouter