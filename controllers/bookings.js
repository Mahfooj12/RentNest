const Booking = require('../models/booking');
const Listing = require('../models/listing');
const User = require('../models/user');
const { sendMail } = require('../utils/email');

// Show booking form for a listing
exports.renderBookingForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings');
  }
  res.render('bookings/new', { listing });
};

// Create a booking (prevent double bookings)
exports.createBooking = async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, guests } = req.body;
  const listing = await Listing.findById(id).populate('owner');
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings');
  }
  // Prevent double bookings
  const overlapping = await Booking.findOne({
    listing: id,
    $or: [
      { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
      { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
      { checkIn: { $lte: new Date(checkIn) }, checkOut: { $gte: new Date(checkOut) } }
    ],
    status: 'confirmed'
  });
  if (overlapping) {
    req.flash('error', 'This listing is already booked for those dates.');
    return res.redirect(`/listings/${id}/book`);
  }
  const booking = new Booking({
    listing: id,
    user: req.user._id,
    checkIn,
    checkOut,
    guests
  });
  await booking.save();

  // Email notifications
  const guest = await User.findById(req.user._id);
  if (guest && guest.email) {
    sendMail({
      to: guest.email,
      subject: 'Booking Created',
      text: `Your booking for ${listing.title} is created and pending host approval.`
    }).catch(console.error);
  }
  if (listing.owner && listing.owner.email) {
    sendMail({
      to: listing.owner.email,
      subject: 'New Booking Request',
      text: `You have a new booking request for your listing: ${listing.title}.`
    }).catch(console.error);
  }

  req.flash('success', 'Booking confirmed!');
  res.redirect(`/listings/${id}`);
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const booking = await Booking.findById(bookingId).populate('user listing');
  if (!booking || !booking.user.equals(req.user._id)) {
    req.flash('error', 'Not authorized or booking not found');
    return res.redirect('/profile');
  }
  booking.status = 'cancelled';
  await booking.save();
  // Email notification
  if (booking.user && booking.user.email) {
    sendMail({
      to: booking.user.email,
      subject: 'Booking Cancelled',
      text: `Your booking for ${booking.listing.title} has been cancelled.`
    }).catch(console.error);
  }
  req.flash('success', 'Booking cancelled');
  res.redirect('/profile');
};

// Approve a booking (host)
exports.approveBooking = async (req, res) => {
  const { bookingId } = req.params;
  const booking = await Booking.findById(bookingId).populate('listing user');
  if (!booking) {
    req.flash('error', 'Booking not found');
    return res.redirect('/listings/dashboard');
  }
  // Only the host can approve
  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash('error', 'Not authorized');
    return res.redirect('/listings/dashboard');
  }
  booking.status = 'confirmed';
  await booking.save();
  // Email notification
  if (booking.user && booking.user.email) {
    sendMail({
      to: booking.user.email,
      subject: 'Booking Approved',
      text: `Your booking for ${booking.listing.title} has been approved!`
    }).catch(console.error);
  }
  req.flash('success', 'Booking approved!');
  res.redirect('/listings/dashboard');
};

// Reject a booking (host)
exports.rejectBooking = async (req, res) => {
  const { bookingId } = req.params;
  const booking = await Booking.findById(bookingId).populate('listing user');
  if (!booking) {
    req.flash('error', 'Booking not found');
    return res.redirect('/listings/dashboard');
  }
  // Only the host can reject
  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash('error', 'Not authorized');
    return res.redirect('/listings/dashboard');
  }
  booking.status = 'cancelled';
  await booking.save();
  // Email notification
  if (booking.user && booking.user.email) {
    sendMail({
      to: booking.user.email,
      subject: 'Booking Rejected',
      text: `Your booking for ${booking.listing.title} has been rejected.`
    }).catch(console.error);
  }
  req.flash('success', 'Booking rejected!');
  res.redirect('/listings/dashboard');
}; 