import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloundinary url
      required: [true, "videoFile is required"],
    },
    thumbnail: {
      type: String, // cloundinary url
      required: [true, "thumbnail is required"],
    },
    title: {
      type: String,
      required: [true, "title is required"],
    },
    description: {
      type: String, // cloundinary url
      required: [true, "description is required"],
    },
    duration: {
      type: Number, // cloundinary url
      required: [true, "duration is required"],
    },
    views: {
      type: String,
      default: "0",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
