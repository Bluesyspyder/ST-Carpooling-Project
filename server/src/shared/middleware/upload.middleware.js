import multer from 'multer';
import ApiError from '../utils/api-error.js';

// Use memory storage to get file buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'));
  }
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Convert file buffer to base64 data URL
 */
export const convertToBase64 = (file) => {
  if (!file) return null;
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};

/**
 * Middleware to handle file upload and convert to base64
 */
export const handleImageUpload = (fieldName) => {
  return (req, res, next) => {
    uploadSingle.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size must not exceed 5MB'));
        }
        return next(new ApiError(400, err.message));
      } else if (err) {
        return next(err);
      }

      if (req.file) {
        req.fileBase64 = convertToBase64(req.file);
      }

      next();
    });
  };
};
