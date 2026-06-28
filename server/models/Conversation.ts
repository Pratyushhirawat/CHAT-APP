import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConversation extends Document{
    participants: string[];
    lastMessage?: mongoose.Types.ObjectId;
    updatedAt: Date 
}

const ConversationSchema = new Schema<IConversation>({
    participants: [{type: String, ref:"User", required: true}],
    lastMessage: {type: Schema.Types.ObjectId, ref: "Conversation" },
}, {timestamps: true})

ConversationSchema.index({ participants: 1})

const Conversation: Model<IConversation> = mongoose.model("Conversation", ConversationSchema)

export default Conversation;