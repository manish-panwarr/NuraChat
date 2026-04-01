import multer from "multer";

// Allowed file types (including video)
const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
];

// Use memory storage — files go into buffer for Cloudinary upload (no local disk writes)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max (supports video)
    },
});

export default upload;
