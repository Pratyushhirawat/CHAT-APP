import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document{
    sender: string;
    receiver?: string;
    conversationId: mongoose.Types.ObjectId;
    text?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    read: boolean;
    createdAt: Date; 
}

const MessageSchema = new Schema<IMessage>({
    sender: {type: String, ref:"User", required: true},
    receiver: {type: String, ref:"User"},
    conversationId: {type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    text: {type: String, trim: true},
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ['image', 'video'] },
    read: {type: Boolean, default: false},
}, {timestamps: true})


const Message: Model<IMessage> = mongoose.model("Message", MessageSchema)

export default Message