// ==================== ENV CONFIG ====================
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ==================== IMPORTS ====================
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require('method-override');
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo').default; // ✅ v6 compatible
const flash = require("connect-flash");
const passport = require('passport');
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Routers
const listingRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingsRouter = require('./routes/bookings');

// ==================== BASIC MIDDLEWARE ====================
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", 1);

// ==================== MONGODB CONNECTION ====================
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");
    return cachedConnection;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    cachedConnection = null;
    throw err;
  }
}

// Local development mein turant connect karo
if (!process.env.VERCEL) {
  connectDB().catch((err) => console.error("Initial DB connect failed:", err));
}

// ==================== EJS SETUP ====================
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== DB CONNECTION MIDDLEWARE ====================
// ⚠️ Session se PEHLE hona chahiye
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection middleware error:", err.message);
    next(err);
  }
});

// ==================== SESSION CONFIG ====================
const sessionOptions = {
  secret: process.env.SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600,
    crypto: {
      secret: process.env.SECRET || "mysupersecretcode",
    },
  }),
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ==================== PASSPORT CONFIG ====================
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ==================== FLASH LOCALS ====================
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ==================== ROUTES ====================
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/bookings", bookingsRouter);
app.use("/", userRouter);

// ==================== 404 HANDLER ====================
app.use((req, res, next) => {
  console.log("Unmatched route:", req.method, req.url);
  next(new ExpressError(404, "Page Not Found"));
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong" } = err;
  console.error("Error:", statusCode, message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).render("listings/error.ejs", { message });
});

// ==================== EXPORT (Vercel) ====================
module.exports = app;

// ==================== LOCAL SERVER ====================
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}