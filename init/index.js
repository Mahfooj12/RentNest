const mongoose = require('mongoose');
const axios = require('axios');
const initData = require("./data");
const Listing = require('../models/listing.js');
const User = require('../models/user');

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to DB");
    await initDb();
  } catch (err) {
    console.log("❌ Error connecting to DB:", err);
  }
}

const geocodeLocation = async (location) => {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: location,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": "wanderlust-app"
      }
    });
    if (res.data.length > 0) {
      const { lat, lon } = res.data[0];
      return {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)]
      };
    } else {
      console.warn(`⚠️ No coordinates found for: ${location}`);
      return { type: "Point", coordinates: [0, 0] };
    }
  } catch (err) {
    console.error(`❌ Geocoding error for "${location}":`, err.message);
    return { type: "Point", coordinates: [0, 0] };
  }
};

const seedUsers = async () => {
  // Create advanced users
  const mahfooj = new User({
    username: 'Mahfooj',
    email: 'mahfooj96@gmail.com',
    isSuperhost: true,
    isVerified: true,
    avatar: 'https://i.pravatar.cc/120?img=3',
    bio: 'Loves to meet new people and share travel stories.',
    work: 'StayVista Explorer',
    funFact: 'I spend too much time: Traveling, music and new place to eat.',
    languages: ['English', 'Hindi'],
    responseRate: '100%',
    responseTime: 'an hour',
    joined: '2020',
    hostReviews: [
      { guestName: 'jary', date: 'March 2024', comment: 'Mahfooj was a fantastic host!' },
      { guestName: 'Kashif', date: 'Feb 2024', comment: 'Very responsive and helpful.' }
    ]
  });
  await User.register(mahfooj, 'password123');

  const jary = new User({
    username: 'jary',
    email: 'jary@example.com',
    avatar: 'https://i.pravatar.cc/120?img=4',
    languages: ['English'],
    joined: '2021'
  });
  await User.register(jary, 'password123');

  const kashif = new User({
    username: 'Kashif',
    email: 'kashif@example.com',
    avatar: 'https://i.pravatar.cc/120?img=5',
    languages: ['English', 'Hindi'],
    joined: '2022'
  });
  await User.register(kashif, 'password123');

  return { mahfooj, jary, kashif };
};

const initDb = async () => {
  try {
    await Listing.deleteMany({});
    await User.deleteMany({});
    console.log("🗑️ Old data cleared");

    const { mahfooj, jary, kashif } = await seedUsers();

    const listingsWithGeo = [];
    for (let obj of initData.data) {
      const geometry = await geocodeLocation(obj.location);
      listingsWithGeo.push({
        ...obj,
        image: obj.image.url,
        guests: obj.guests || 2,
        owner: mahfooj._id,
        coHosts: [jary._id, kashif._id],
        geometry
      });
    }

    await Listing.insertMany(listingsWithGeo);
    console.log("✅ Sample data inserted with advanced host features");
    // Optionally seed bookings/reviews here
  } catch (err) {
    console.log("❌ Error saving data:", err);
  }
};

main();
