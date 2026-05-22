import mongoose from "mongoose";

let connected = false;

export async function connectDatabase() {
  if (connected || mongoose.connection.readyState === 1) {
    connected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);
  connected = true;
  return mongoose.connection;
}
