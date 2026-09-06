const express = require('express');
const router = express.Router();
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// User dashboard (their own listings)
router.get('/dashboard', isLoggedIn, wrapAsync(listingController.dashboard));

// Index Route - Show all listings
router.route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New Form Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Show, Update, Delete Routes
router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.destroyListing)
  );

// Edit Form Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

// Book Form Route
router.get("/:id/book", isLoggedIn, wrapAsync(listingController.renderBookForm));

// Book Submit Route
router.post("/:id/book", isLoggedIn, wrapAsync(listingController.createBooking));

module.exports = router;
