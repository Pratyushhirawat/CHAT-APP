import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import Conversation from "../models/Conversation.js";
import cloudinary from "../config/coudinary.js";
import { Readable } from "stream";
import Message from "../models/Messages.js";

// Helper: find a conversation between two users
async function findConversation(userId: string, otherId: string ) {
    return Conversation.findOne({
        $and: [
            {participants: { $elemMatch: { $eq: userId } }},
            {participants: { $elemMatch: { $eq: otherId } }},
            {$expr: {$eq: [{ $size: "$participant"}, 2]}}
        ]
    } as any)
}


// Start or get a conversation with a user
export const getOrCreateConversation = async (req: AuthRequest, res: Response) => {
    const userId =  req.user!.id;
    const targetUserId = String(req.params.targetUserId)

    let conversation : any = await findConversation(userId, targetUserId);

    if (conversation) {
        await conversation.populate("participants", "name email handle avatar isOnline lasrSeeb+n");
        await conversation.populate("lastMessage")
    }else{
        conversation = await Conversation.create({participants: [userId, String(targetUserId) ]})
        await conversation.populate("participants", "name email handle avatar isOnline lastSeen");
    }

    const other = (conversation.participants as any[]).find((p: any) => String(p._id !== userId ));

    res.json({
        success: true,
        conversation: { _id: conversation._id, participant: other, lastMessage: conversation.lastMessage },
    })
}

// Get all the conversations for the current user
export const getConversations = async (req: AuthRequest, res: Response) => {
    const userId =  req.user!.id;
    const conversations = await Conversation.find({ participants: {$in: [userId] }}).populate("participants", "name email handle avatar isOnline lastSeen").populate("lastMessage").sort({ updatedAt: -1})

    const shaped = conversations.map((c) => {
        const other = (c.participants as any[]).find((p: any) => String(p._id) !== userId);
        return { _id: c._id, isGroup: false, participant: other, lastMessage: c.lastMessage, updatedAt: c.updatedAt }
    })

    res.json({ success: true, conversations: shaped })
}

// Send a message
export const sendMessage= async (req: AuthRequest, res: Response) => {
    const senderId = req.user!.id;
    const { receiverId, conversationId, text } = req.body;
    const file = req.file;

    if((!receiverId && !conversationId) || (!text.trim() && !file)) {
        res.status(400).json({success: false, message: "receiverId/conversatioId and (text or file) are required"})
        return;
    }

    let mediaUrl = "";
    let mediaType: 'image' | 'video' | undefined;

    if (file) {
            try {
                const resourceType = file.mimetype.startsWith('video') ? "video" : "image";
                mediaType = resourceType;

                const uploadPromise = new Promise<{secure_url: string}>((resolve, reject)=>{
                const uploadStream = cloudinary.uploader.upload_stream({folder: "insta_chat", resource_type: resourceType}, (error, result) => {
                    if (error) reject (error)
                        else resolve( result as any)
                })
                const readableStream = new Readable()
                readableStream.push(file.buffer)
                readableStream.push(null);
                readableStream.pipe(uploadStream)
                })
    
                const result = await uploadPromise;
                mediaUrl = result.secure_url;
            } catch (err) {
                console.error("Cloudinary upload error: ", err);
                res.status(500).json({ success: false, message: "Media upload failed"});
                return
            }
        }
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findOne({ _id: conversationId, participants: { $in: [senderId] }})
        }else {
            conversation = await findConversation(senderId, receiverId)
            if (!conversation) {
                conversation = await Conversation.create({ participants: [ senderId, receiverId ]})
            }
        }
        if (!conversation) {
            res.status(404).json({ success: false, message: "Conversation not found" });
             return
        }

        const message = await Message.create({
            sender: senderId,
            receiver: receiverId || conversation.participants.find((p) => String(p) !== senderId),
            conversationId: conversation._id,
            text: text?.trim(),
            mediaUrl: mediaUrl || undefined,
            mediaType
        })

        conversation.lastMessage = message._id as any;
        conversation.updatedAt = new Date();
        await conversation.save();

        res.status(201).json({success: true, message})
}

// Get all message in a Conversation
export const getMessages= async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: { $in: [ userId] } })
    if (!conversation) {
        res.status(404).json({ success: false, message: "Conversation not found" });
        return
    }

    const messages = await Message.find({conversationId}).sort({ createdAt: 1});
    await Message.updateMany({conversationId, receiver: userId, read: false}, {read: true})

    res.json({ success: true, messages})
}

// Delete a Conversation
export const deleteConversation = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            res.status(404).json({ success: false, message: "Conversation not found" });
            return
        }

        // Check if user is a part of a conversation
        const isParticipant = conversation.participants.some((p)=> String(p) === userId)
        if (!isParticipant) {
            res.status(403).json({ success: false, message: "Not authorized to delete this conversation" });
            return;
        }

        // Notify other participants before deleting


        // Delete the conversation itself
        await Conversation.findByIdAndDelete(conversationId);

        res.json({ success: true, mesage: "Chat deleted successfully" })
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error"});
    }
}
