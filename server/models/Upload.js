const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalImage: { type: String, required: true }, // path or URL
    maskImage: { type: String }, // base64 PNG
    overlayImage: { type: String }, // base64 PNG
    stats: {
      road_coverage_percent: Number,
      road_pixels: Number,
      total_pixels: Number,
      estimated_road_length_m: Number,
      estimated_area_m2: Number,
    },
    location: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.209 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Upload", uploadSchema);