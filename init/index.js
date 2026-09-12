// ==================== ENV CONFIG ====================
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "../.env" }); // ✅ init folder se parent .env
}

const mongoose = require('mongoose');
const initData = require("./data");
const Listing = require('../models/listing.js');
const User = require('../models/user');

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

// ==================== SEED USERS ====================
const seedUsers = async () => {
  console.log("👥 Seeding users...");

  const mahfooj = new User({
    username: "Mahfooj",
    email: "mahfooj96@gmail.com",
    isSuperhost: true,
    isVerified: true,
    avatar: "https://i.pravatar.cc/120?img=3",
    bio: "Loves to meet new people and share travel stories.",
    work: "StayVista Explorer",
    funFact: "I spend too much time: Traveling, music and new place to eat.",
    languages: ["English", "Hindi"],
    responseRate: "100%",
    responseTime: "an hour",
    joined: "2020",
    hostReviews: [
      { guestName: "jary", date: "March 2024", comment: "Mahfooj was a fantastic host!" },
      { guestName: "Kashif", date: "Feb 2024", comment: "Very responsive and helpful." },
    ],
  });
  await User.register(mahfooj, "password123");

  const jary = new User({
    username: "jary",
    email: "jary@example.com",
    avatar: "https://i.pravatar.cc/120?img=4",
    languages: ["English"],
    joined: "2021",
  });
  await User.register(jary, "password123");

  const kashif = new User({
    username: "Kashif",
    email: "kashif@example.com",
    avatar: "https://i.pravatar.cc/120?img=5",
    languages: ["English", "Hindi"],
    joined: "2022",
  });
  await User.register(kashif, "password123");

  console.log("✅ Users seeded: Mahfooj, jary, Kashif (password: password123)");
  return { mahfooj, jary, kashif };
};

// ==================== SEED LISTINGS (Geocoding Skipped) ====================
const initDb = async () => {
  try {
    // 1. Clear old data
    await Listing.deleteMany({});
    await User.deleteMany({});
    console.log("🗑️  Old data cleared");

    // 2. Create users
    const { mahfooj, jary, kashif } = await seedUsers();

    // 3. Prepare listings WITHOUT geocoding
    console.log(`📦 Preparing ${initData.data.length} listings...`);

    const listingsWithGeo = initData.data.map((obj) => ({
      ...obj,
      image: obj.image?.url || obj.image || "",
      guests: obj.guests || 2,
      owner: mahfooj._id,
      coHosts: [jary._id, kashif._id],
      // ⚠️ Dummy coordinates (map pe marker [0,0] pe dikhega)
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    }));

    // 4. Insert all listings
    await Listing.insertMany(listingsWithGeo);
    console.log(`✅ ${listingsWithGeo.length} listings inserted successfully!`);
    console.log("");
    console.log("🎉 Seeding complete!");
    console.log("👤 Login: Mahfooj / password123");
    console.log("🌐 Ab browser mein /listings refresh karein.");
  } catch (err) {
    console.log("❌ Error saving data:", err);
  }
};

// ==================== MAIN ====================
async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to DB");
    await initDb();
  } catch (err) {
    console.log("❌ Error connecting to DB:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from DB");
    process.exit(0);
  }
}

main();
