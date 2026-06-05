import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import User from './src/modules/users/user.model.js';
import Vehicle from './src/modules/vehicles/vehicle.model.js';

// Simple base64 dummy images (1x1 colored PNG pixels for demo)
// Profile image - teal/emerald color
const dummyProfileImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Vehicle image - slate color
const dummyVehicleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/carpool';
    console.log(`🔗 Connecting to MongoDB...`);
    await mongoose.connect(mongoURI);
    console.log(`✅ Connected to MongoDB\n`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Generate a proper base64 dummy image (32x32 colored PNG)
 */
function generateDummyProfileImage(seed) {
  // Create a colored square image in base64
  // This is a simple 32x32 PNG with an emerald color
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMUlEQVRYhe3MMQEAMAgEMPzr7I1MjkR6gCT0DzNzc3NzInJfRERERERERERERERERP4AjHsNLbVjUDIAAAAASUVORK5CYII=';
}

function generateDummyVehicleImage(seed) {
  // This is a simple 32x32 PNG with a slate color
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMUlEQVRYhe3MOQEAMAgFsH/PDlRMhMSU5EyEhZaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpb+AT8QDdWiWlJpAAAAAElFTkSuQmCC';
}

/**
 * Seed dummy photos to existing hybrid users
 */
async function seedDummyPhotos() {
  try {
    console.log('📸 Starting dummy photo seeding...\n');

    // Find all driver users (hybrid users)
    const driverUsers = await User.find({ role: 'driver' });
    console.log(`📊 Found ${driverUsers.length} driver users\n`);

    if (driverUsers.length === 0) {
      console.log('⚠️  No driver users found in database');
      return;
    }

    let profilesUpdated = 0;
    let vehiclesUpdated = 0;

    // Update each driver user
    for (const user of driverUsers) {
      // Add profile image if not already present
      if (!user.profileImage) {
        user.profileImage = generateDummyProfileImage(user._id);
        await user.save();
        profilesUpdated++;
        console.log(`✅ Added profile photo to: ${user.firstName} ${user.lastName} (${user.email})`);
      } else {
        console.log(`⏭️  Profile photo already exists for: ${user.firstName} ${user.lastName}`);
      }

      // Update their vehicles with dummy vehicle image using updateMany
      const result = await Vehicle.updateMany(
        { owner: user._id, vehicleImage: { $exists: false } },
        { $set: { vehicleImage: generateDummyVehicleImage(user._id) } }
      );
      
      if (result.modifiedCount > 0) {
        vehiclesUpdated += result.modifiedCount;
        console.log(`   ✅ Added vehicle photos to ${result.modifiedCount} vehicle(s)`);
      } else {
        const vehicleCount = await Vehicle.countDocuments({ owner: user._id });
        if (vehicleCount === 0) {
          console.log(`   ℹ️  No vehicles found for this user`);
        } else {
          console.log(`   ⏭️  All vehicles already have photos`);
        }
      }
    }

    console.log(`\n📈 Seeding Complete:`);
    console.log(`   • Profile photos added: ${profilesUpdated}/${driverUsers.length}`);
    console.log(`   • Vehicle photos added: ${vehiclesUpdated}`);
    console.log(`\n✨ All dummy photos have been added successfully!\n`);

  } catch (error) {
    console.error(`❌ Error during seeding: ${error.message}`);
    console.error(error);
  }
}

/**
 * Main execution
 */
async function main() {
  await connectDB();
  await seedDummyPhotos();
  await mongoose.connection.close();
  console.log('🔌 Database connection closed\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
