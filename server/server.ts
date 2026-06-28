import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import { clerkMiddleware } from '@clerk/express'
import cors from "cors";
import connectDb from "./config/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

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
app.use('/api/messages', messageRouter)


// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, message: err?.message || "Something went wrong!" });
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});