import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlist = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    description: {
      type: Text,
      required: false,
      default: "",
    },
    videos: {
      type: Schema.Types.ObjectId,
      ref: "Video",
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

playlist.plugin(mongooseAggregatePaginate);
export const Playlist =
  mongoose.models.playlist || mongoose.model("Playlist", playlist);
