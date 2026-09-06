const Listing = require("../models/listing");
const Booking = require("../models/booking"); // ✅ Moved to top
const axios = require("axios");
const { cloudinary } = require('../cloudConfig');

// Helper: Geocode location to coordinates
async function geocodeLocation(location) {
  try {
    const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: location,
        format: "json"
      },
      headers: {
        "User-Agent": "RentNest-App"
      },
      timeout: 5000 // 5 second timeout
    });
    if (geoRes.data.length > 0) {
      const { lat, lon } = geoRes.data[0];
      return {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)]
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error.message);
    return null; // Don't fail the whole request if geocoding fails
  }
}

// INDEX - Show all listings
module.exports.index = async (req, res) => {
  try {
    const { location, minPrice, maxPrice, guests, checkin, checkout } = req.query;
    let filter = {};
    if (location) filter.location = new RegExp(location, 'i');
    if (minPrice) filter.price = { ...filter.price, $gte: parseInt(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseInt(maxPrice) };

    // Parse guests
    let totalGuests = 0;
    if (guests) {
      try {
        const guestCounts = JSON.parse(guests);
        totalGuests = (guestCounts.adults || 0) + (guestCounts.children || 0);
        if (totalGuests > 0) filter.guests = { $gte: totalGuests };
      } catch (e) {
        if (!isNaN(guests)) filter.guests = { $gte: parseInt(guests) };
      }
    }

    // Get listings
    let listings = await Listing.find(filter);

    // Date filtering
    if (checkin && checkout) {
      const checkInDate = new Date(checkin);
      const checkOutDate = new Date(checkout);
      const booked = await Booking.find({
        status: 'confirmed',
        $or: [
          { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
        ]
      }).distinct('listing');
      listings = listings.filter(l => !booked.includes(l._id.toString()));
    }

    res.render("listings/index", { 
      listings, 
      location, 
      minPrice, 
      maxPrice, 
      guests 
    });
  } catch (error) {
    console.error("Index error:", error);
    req.flash("error", "Error loading listings");
    res.redirect("/");
  }
};

// RENDER NEW FORM
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
};

// SHOW LISTING
module.exports.showListing = async (req, res) => {
  try {
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
      req.flash("error", "Listing does not exist!");
      return res.redirect("/listings");
    }
    res.render("listings/show", { listing });
  } catch (error) {
    console.error("Show listing error:", error);
    req.flash("error", "Error loading listing");
    res.redirect("/listings");
  }
};

// CREATE LISTING
module.exports.createListing = async (req, res) => {
  try {
    const { title, description, location, country, price, guests } = req.body.listing;
    
    // Validate required fields
    if (!title || !description || !location || !country || !price) {
      req.flash("error", "All required fields must be filled");
      return res.redirect("/listings/new");
    }

    const listing = new Listing({
      title,
      description,
      location,
      country,
      price: parseInt(price),
      guests: parseInt(guests) || 1,
      owner: req.user._id
    });

    // Handle image upload
    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename
      };
    } else {
      // Set default image if no image uploaded
      listing.image = {
        url: "https://res.cloudinary.com/dwqnxrxru/image/upload/v1/RentNest/default.jpg",
        filename: "default"
      };
    }

    // Geocode location (don't fail if it doesn't work)
    const geometry = await geocodeLocation(location);
    if (geometry) {
      listing.geometry = geometry;
    }

    await listing.save();
    req.flash("success", "Listing created successfully!");
    res.redirect(`/listings/${listing._id}`);
  } catch (error) {
    console.error("Create listing error:", error);
    req.flash("error", "Failed to create listing: " + error.message);
    res.redirect("/listings/new");
  }
};

// RENDER EDIT FORM
module.exports.renderEditForm = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    res.render("listings/edit", { listing });
  } catch (error) {
    console.error("Edit form error:", error);
    req.flash("error", "Error loading edit form");
    res.redirect("/listings");
  }
};

// UPDATE LISTING
module.exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, country, price, guests } = req.body.listing;
    
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    // Update fields
    listing.title = title;
    listing.description = description;
    listing.location = location;
    listing.country = country;
    listing.price = parseInt(price);
    listing.guests = parseInt(guests) || 1;

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary
      if (listing.image && listing.image.filename) {
        try {
          await cloudinary.uploader.destroy(listing.image.filename);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
      listing.image = {
        url: req.file.path,
        filename: req.file.filename
      };
    }

    // Update geocoding if location changed
    if (listing.isModified('location')) {
      const geometry = await geocodeLocation(location);
      if (geometry) {
        listing.geometry = geometry;
      }
    }

    await listing.save();
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${listing._id}`);
  } catch (error) {
    console.error("Update listing error:", error);
    req.flash("error", "Failed to update listing");
    res.redirect(`/listings/${req.params.id}/edit`);
  }
};

// DELETE LISTING
module.exports.destroyListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings/dashboard");
    }

    // Delete image from Cloudinary
    if (listing.image && listing.image.filename) {
      try {
        await cloudinary.uploader.destroy(listing.image.filename);
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }

    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings/dashboard");
  } catch (error) {
    console.error("Delete listing error:", error);
    req.flash("error", "Failed to delete listing");
    res.redirect("/listings/dashboard");
  }
};

// DASHBOARD
module.exports.dashboard = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user._id });
    const listingIds = listings.map(l => l._id);
    const bookings = await Booking.find({ listing: { $in: listingIds } })
      .populate('listing')
      .populate('user');
    
    res.render("listings/dashboard", { listings, bookings });
  } catch (error) {
    console.error("Dashboard error:", error);
    req.flash("error", "Error loading dashboard");
    res.redirect("/listings");
  }
};

// RENDER BOOK FORM
module.exports.renderBookForm = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    res.render("bookings/new", { listing });
  } catch (error) {
    console.error("Book form error:", error);
    req.flash("error", "Error loading booking form");
    res.redirect("/listings");
  }
};

// CREATE BOOKING
module.exports.createBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

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
    const guestCount = parseInt(guests);
    if (!guestCount || guestCount < 1 || guestCount > listing.guests) {
      req.flash("error", `Number of guests must be between 1 and ${listing.guests}`);
      return res.redirect(`/listings/${id}/book`);
    }

    // Check for overlapping bookings
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

    // Create booking
    const booking = new Booking({
      listing: id,
      user: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestCount,
      status: 'confirmed'
    });

    await booking.save();
    req.flash("success", "Booking successful!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Create booking error:", error);
    req.flash("error", "Failed to create booking");
    res.redirect(`/listings/${req.params.id}`);
  }
};
