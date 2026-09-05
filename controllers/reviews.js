const Listing = require("../models/listing");
const Review = require("../models/review");

// Add a review to a listing
exports.createReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body.review;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings');
  }
  // Prevent multiple reviews by same user
  const existing = await Review.findOne({ listing: id, author: req.user._id });
  if (existing) {
    req.flash('error', 'You have already reviewed this listing.');
    return res.redirect(`/listings/${id}`);
  }
  const review = new Review({
    listing: id,
    author: req.user._id,
    rating,
    comment
  });
  await review.save();
  listing.reviews.push(review._id);
  await listing.save();
  req.flash('success', 'Review added!');
  res.redirect(`/listings/${id}`);
};

// Delete a review
exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  await Review.findByIdAndDelete(reviewId);
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  req.flash('success', 'Review deleted!');
  res.redirect(`/listings/${id}`);
};

