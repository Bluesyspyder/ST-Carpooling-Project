"use client";
import { useState, useCallback } from 'react';
import api from '@/services/api';

/**
 * RatingModal — slide-up modal for rating a completed ride.
 *
 * Props:
 *  - bookingId: string       - ID of the booking to rate
 *  - driverName: string      - Driver's display name
 *  - onClose: () => void     - Called when modal is dismissed
 *  - onSuccess: () => void   - Called after successful rating submission
 */
const RatingModal = ({ bookingId, driverName, onClose, onSuccess }) => {
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      setError('Please select a rating (1–5 stars)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post(`/reviews/bookings/${bookingId}/rate`, { rating, comment });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[RatingModal] Failed to submit rating:', err);
      setError(err.response?.data?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [rating, comment, bookingId, onClose, onSuccess]);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-6 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-50">
        <div className="glass-panel rounded-2xl border border-[var(--border-default)]/80 p-6 shadow-2xl">

          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl">⭐</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Thanks for your feedback!</h3>
              <p className="text-sm text-[var(--text-secondary)]">Your rating helps the ST Carpool community.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Rate Your Rider</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">How was your ride with {driverName}?</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-surface-hover)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Star selector */}
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <span className={`transition-colors duration-150 ${
                      star <= (hovered || rating)
                        ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : 'text-[var(--text-muted)]'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>

              {/* Label */}
              <p className="text-center text-sm font-semibold text-amber-400 h-5 mb-5">
                {labels[hovered || rating] || ''}
              </p>

              {/* Comment */}
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any comments? (optional)"
                className="w-full px-4 py-3 bg-[var(--bg-surface)]/60 border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
              />

              {error && (
                <p className="text-xs text-red-400 mt-2 bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠ {error}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-sm font-semibold transition"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || rating === 0}
                  className="flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-[var(--text-primary)] rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-400/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : 'Submit Rating'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default RatingModal;
