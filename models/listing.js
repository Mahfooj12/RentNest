const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  location: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  guests: { type: Number, required: true, min: 1 },
  image: String,
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  coHosts: [{ type: Schema.Types.ObjectId, ref: "User" }],
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
});

module.exports = mongoose.model("Listing", listingSchema);

