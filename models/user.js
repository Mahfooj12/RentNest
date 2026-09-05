const mongoose = require('mongoose');
// const passport = require('passport');
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

const userSchema=new Schema({
  email:{
    type:String,
    required:true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  isSuperhost: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  avatar: { type: String },
  bio: { type: String },
  work: { type: String },
  funFact: { type: String },
  languages: [{ type: String }],
  responseRate: { type: String },
  responseTime: { type: String },
  joined: { type: String },
  hostReviews: [{
    guestName: String,
    date: String,
    comment: String
  }],
});

userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);