import { NextFunction, Request, Response } from "express";
import { clerkMiddleware, clerkClient, requireAuth, getAuth } from '@clerk/express'
import User from "../models/User.js";

export interface AuthRequest extends Request {
    user?: { id: string, name: string, email: string}
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthenticated"})
            return
        }

        // Check  if user exists locally in mongodb
        let localUser = await User.findById(userId);

        if (!localUser) {
            // Lazy Sync: Fetch details from Clerk API
            const clerkUser = await clerkClient.users.getUser(userId)
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "Anonymous";

            // Create fallback handle
            const handle = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] || userId;

            // Ensure unique handle in DB by appending random suffix if needed 
            let finalHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
            let handleExists = await User.findOne({ handle: finalHandle})
            let counter = 1;
            while (handleExists) {
                const testHandle = `${finalHandle}${counter}`;
                handleExists = await User.findOne({ handle: testHandle})
                if (!handleExists) {
                    finalHandle = testHandle
                    break;
                }
                counter++
            }
            localUser = await User.create({
                _id: userId,
                name,
                email: email.toLowerCase(),
                handle: finalHandle,
                avatar: clerkUser.imageUrl || "",
                bio: "Hey there I am using InstaChat",
                isOnline: true,
                lastSeen: new Date(),
            })

        }

        // Attach user info request for compatibility
        req.user  = {
            id: localUser._id,
            name: localUser.name,
            email: localUser.email
        }
        next()
    } catch (error) {
        console.error("Auth middleware Error:", error)
        res.status(401).json({ success: false, message: "Invalid or erpired token"})
    }
}