// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Zone Schema — GeoJSON polygon defining a campus / office geofence.
 *
 * Each Zone represents a named area (e.g. "ST Greater Noida Campus",
 * "Noida Sector 62 Hub") with a GeoJSON Polygon boundary.
 *
 * The `2dsphere` index on `polygon` enables:
 *   - $geoWithin queries: "is this point inside the zone?"
 *   - $geoIntersects queries: "does a route cross this zone?"
 *
 * Usage in ride matching (ride.service.ts getRides):
 *   If any Zone documents exist, only surface rides whose pickup is
 *   $geoWithin at least one active zone polygon.  Falls back to the
 *   existing haversine radius filter when no zones are configured.
 */
const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // GeoJSON Polygon — array of rings, each ring is [[lng, lat], …]
    // MongoDB GeoJSON convention: coordinates are [longitude, latitude].
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]],
        required: [true, 'Polygon coordinates are required'],
        validate: {
          validator: (rings) => {
            // At least one ring with at least 4 positions (first === last to close)
            return (
              rings.length > 0 &&
              rings[0].length >= 4 &&
              rings[0][0][0] === rings[0][rings[0].length - 1][0] &&
              rings[0][0][1] === rings[0][rings[0].length - 1][1]
            );
          },
          message:
            'Polygon must have at least one ring with ≥ 4 positions, first === last to close the ring.',
        },
      },
    },
    // Optional center point for display / quick proximity queries
    center: {
      latitude:  { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index — required for $geoWithin / $geoIntersects queries
zoneSchema.index({ polygon: '2dsphere' });

const Zone = mongoose.models.Zone || mongoose.model('Zone', zoneSchema);

export default Zone;
