const express = require('express');
const router = express.Router({ mergeParams: true });

const wrapAsync = require("../utils/wrapAsync.js");
const {validateReview} = require("../middleware.js");
const { isLoggedIn, isReviewAuthor } = require('../middleware');
const reviewsController = require('../controllers/reviews');

// Post review route
router.post("/", isLoggedIn, validateReview, wrapAsync(reviewsController.createReview));

// Delete review route
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(reviewsController.deleteReview));

module.exports = router;