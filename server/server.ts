import "dotenv/config";
import express, { Request, Response } from 'express';
import { clerkMiddleware } from '@clerk/express'
import cors from "cors";
import connectDb from "./config/db.js";
import userRouter from "./routes/userRoutes.js";

const app = express();


await connectDb()

// Middleware
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware())

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/users', userRouter)

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});