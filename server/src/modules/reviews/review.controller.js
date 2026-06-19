import * as reviewService from './review.service.js';

/**
 * POST /api/reviews/bookings/:bookingId/rate
 * Submit a rating for a completed booking.
 */
export const rateBooking = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || typeof rating !== 'number') {
      return res.status(400).json({ status: 'fail', message: 'Rating (1–5) is required' });
    }

    const result = await reviewService.createRating(
      req.params.bookingId,
      req.user.id,
      Math.round(rating),
      comment
    );

    return res.status(200).json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
