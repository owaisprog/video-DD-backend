import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const comment = new Schema(
  {
    text: {
      type: String,
      required: [true, "Text is required"],
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

comment.plugin(mongooseAggregatePaginate);

export const Comment =
  mongoose.models.comment || mongoose.model("Comment", comment);
