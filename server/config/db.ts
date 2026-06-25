import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']); 
import mongoose from 'mongoose';

const connectDb = async () => {
    mongoose.connection.on('connected', async () => console.log("MongoDB Connected"));

    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not defined")
    await mongoose.connect(process.env.MONGODB_URI);
}

export default connectDb