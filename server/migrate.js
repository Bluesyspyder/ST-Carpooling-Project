import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    await mongoose.connection.db.collection('rides').deleteMany({});
    console.log('Deleted all rides');
    
    await mongoose.connection.db.collection('bookings').deleteMany({});
    console.log('Deleted all bookings');

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
