import mongoose from 'mongoose';

/**
 * Connect to MongoDB Database
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/carpool';
    console.log(`Connecting to MongoDB at: ${mongoURI.replace(/:([^:@]+)@/, ':***@')}`);
    
    const conn = await mongoose.connect(mongoURI);
    
    console.log(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
