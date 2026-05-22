import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../server/db.js';
import { runNotifications } from '../server/notify.js';

dotenv.config();

await connectDatabase();
await runNotifications();
await mongoose.connection.close();
