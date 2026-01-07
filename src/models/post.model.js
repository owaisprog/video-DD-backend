import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const post = new Schema(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);
post.plugin(mongooseAggregatePaginate);
export const Post = mongoose.models.Post || mongoose.model("Post", post);
