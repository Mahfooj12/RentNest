const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const bookingsController = require('../controllers/bookings');

// Show booking form for a listing
router.get('/listings/:id/book', isLoggedIn, bookingsController.renderBookingForm);

// Create a booking
router.post('/listings/:id/book', isLoggedIn, bookingsController.createBooking);

// Cancel a booking
router.post('/:bookingId/cancel', isLoggedIn, bookingsController.cancelBooking);

// Approve a booking (host)
router.post('/:bookingId/approve', isLoggedIn, bookingsController.approveBooking);

// Reject a booking (host)
router.post('/:bookingId/reject', isLoggedIn, bookingsController.rejectBooking);

module.exports = router; 