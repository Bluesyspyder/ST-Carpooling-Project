import dbConnect from '../lib/dbConnect';
import User from '../modules/users/user.model';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Connected to database.');
    
    const adminEmail = 'vardaan.ad@st.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log(`Admin user ${adminEmail} already exists. Updating role to admin to ensure idempotency.`);
      existingAdmin.role = 'admin';
      
      const salt = await bcrypt.genSalt(10);
      existingAdmin.password = await bcrypt.hash('admin123', salt);
      
      await existingAdmin.save();
      console.log('Admin user updated successfully.');
      process.exit(0);
    }
    
    console.log(`Creating dummy admin user ${adminEmail}...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = new User({
      firstName: 'Vardaan',
      lastName: 'AD',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });
    
    await adminUser.save();
    console.log('Admin user created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
