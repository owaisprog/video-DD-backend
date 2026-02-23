import mongoose from "mongoose";
import { DB_NAME } from "../../constants.js";
export const connectToDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGOOSE_URI}`
    );
    console.log(
      `Mongodb Connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.error("Mongoose connection error:", err);
    throw new Error(
      `Mongoose connection error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
