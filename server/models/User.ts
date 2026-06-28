import mongoose, { Model } from "mongoose";

export interface IUser {
    _id: string;
    name: string;
    email: string;
    handle: string;
    avatar?: string;
    bio?: string;
    isOnline: boolean;
    lastSeen: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const Userschema = new mongoose.Schema<IUser>({
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

}, {timestamps: true}) 

const User: Model<IUser> = mongoose.model("User", Userschema)

export default User