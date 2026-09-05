const Listing = require("../models/listing");
const axios = require("axios");
const { cloudinary } = require('../cloudConfig');

// Helper: Geocode location to coordinates
async function geocodeLocation(location) {
  const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: location,
      format: "json"
    },
    headers: {
      "User-Agent": "Wanderlust-App"
    }
  });
  if (geoRes.data.length > 0) {
    const { lat, lon } = geoRes.data[0];
    return {
      type: "Point",
      coordinates: [parseFloat(lon), parseFloat(lat)]
    };
  }
  return null;
}

module.exports.index = async (req, res) => {
  const { location, minPrice, maxPrice, guests, checkin, checkout } = req.query;
  let filter = {};
  if (location) filter.location = new RegExp(location, 'i');
  if (minPrice) filter.price = { ...filter.price, $gte: minPrice };
  if (maxPrice) filter.price = { ...filter.price, $lte: maxPrice };

  // Parse guests as JSON if present
  let guestCounts = { adults: 0, children: 0, infants: 0, pets: 0 };
  let totalGuests = 0;
  if (guests) {
    try {
      guestCounts = JSON.parse(guests);
      totalGuests = (guestCounts.adults || 0) + (guestCounts.children || 0);
      if (totalGuests > 0) filter.guests = { $gte: totalGuests };
    } catch (e) {
      // fallback: treat as number
      if (!isNaN(guests)) filter.guests = { $gte: guests };
    }
  }

  // Date filtering: exclude listings with overlapping bookings
  let listings = await Listing.find(filter);
  if (checkin && checkout) {
    const Booking = require('../models/booking');
    const checkInDate = new Date(checkin);
    const checkOutDate = new Date(checkout);
    // Find listings with overlapping bookings
    const booked = await Booking.find({
      status: 'confirmed',
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
      ]
    }).distinct('listing');
    listings = listings.filter(l => !booked.includes(l._id.toString()));
  }
  res.render("listings/index", { listings, location, minPrice, maxPrice, guests });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: 'reviews',
      populate: { path: 'author' }
    })
    .populate({
      path: 'owner',
      select: 'username avatar isSuperhost isVerified bio work funFact languages responseRate responseTime joined hostReviews reviewCount rating yearsHosting birthYear',
    })
    .populate({
      path: 'coHosts',
      select: 'username avatar',
    });
  if (!listing) {
    req.flash("error", "Listing you are requestes for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show", { listing });
};

module.exports.createListing = async (req, res) => {
  try {
    const { title, description, location, country, price, guests } = req.body.listing;
    const listing = new Listing({
      title,
      description,
      location,
      country,
      price,
      guests,
      owner: req.user._id
    });

    if (req.file) {
      listing.image = req.file.path;
    }

    // Geocode location
    listing.geometry = await geocodeLocation(location);
    await listing.save();
    req.flash("success", "Listing created successfully!");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error("Error creating listing:", err);
    req.flash("error", "Failed to create listing. Please try again.");
    res.redirect("/listings/new");
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  res.render("listings/edit", { listing });
};

module.exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, country, price, guests } = req.body.listing;
    const listing = await Listing.findById(id);
    
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    listing.title = title;
    listing.description = description;
    listing.location = location;
    listing.country = country;
    listing.price = price;
    listing.guests = guests;

    if (req.file) {
      listing.image = req.file.path;
    }

    // Geocode location if changed
    if (listing.isModified('location')) {
      listing.geometry = await geocodeLocation(location);
    }

    await listing.save();
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error("Error updating listing:", err);
    req.flash("error", "Failed to update listing. Please try again.");
    res.redirect(`/listings/${req.params.id}/edit`);
  }
};

module.exports.destroyListing = async function(req, res, next) {
  try {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings/dashboard");
    }
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings/dashboard");
  } catch (err) {
    console.error("Error deleting listing:", err);
    req.flash("error", "Failed to delete listing. Please try again.");
    res.redirect("/listings/dashboard");
  }
};

module.exports.dashboard = async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id });
  // Get all bookings for these listings
  const Booking = require("../models/booking");
  const listingIds = listings.map(l => l._id);
  const bookings = await Booking.find({ listing: { $in: listingIds } }).populate('listing user');
  res.render("listings/dashboard", { listings, bookings });
};

module.exports.renderBookForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  res.render("bookings/new", { listing });
};

module.exports.createBooking = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  const Booking = require("../models/booking");
  const { checkIn, checkOut, guests } = req.body;

  // Validate dates
  if (!checkIn || !checkOut) {
    req.flash("error", "Check-in and check-out dates are required.");
    return res.redirect(`/listings/${id}/book`);
  }
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate) || isNaN(checkOutDate)) {
    req.flash("error", "Invalid date format.");
    return res.redirect(`/listings/${id}/book`);
  }
  if (checkInDate >= checkOutDate) {
    req.flash("error", "Check-out must be after check-in.");
    return res.redirect(`/listings/${id}/book`);
  }

  // Validate guests
  if (!guests || guests < 1 || guests > listing.guests) {
    req.flash("error", `Number of guests must be between 1 and ${listing.guests} for this listing.`);
    return res.redirect(`/listings/${id}/book`);
  }

  // Prevent overlapping bookings
  const overlapping = await Booking.findOne({
    listing: id,
    status: 'confirmed',
    $or: [
      { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
    ]
  });
  if (overlapping) {
    req.flash("error", "This listing is already booked for the selected dates.");
    return res.redirect(`/listings/${id}/book`);
  }

  const booking = new Booking({
    listing: id,
    user: req.user._id,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    guests,
    status: 'confirmed'
  });
  await booking.save();
  req.flash("success", "Booking successful!");
  res.redirect("/profile");
};
