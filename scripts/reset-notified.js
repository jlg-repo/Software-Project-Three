import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../server/db.js';
import { User } from '../server/models/User.js';

//simple script for resetting the notified status in case
// it gets bugged and we need to re-send an email
dotenv.config();

await connectDatabase();
const result = await User.updateMany({}, { $set: { lastEmailedAt: null } });
console.log(`Cleared lastEmailedAt for ${result.modifiedCount} user(s).`);
await mongoose.connection.close();
