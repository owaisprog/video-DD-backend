import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const WatchHistorySchema = new Schema(
  {
    user: {
      // who is subscribing
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      // who is being subscribed
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
  },
  { timestamps: true }
);
WatchHistorySchema.plugin(mongooseAggregatePaginate);

export const WatchHistory = mongoose.model("WatchHistory", WatchHistorySchema);
