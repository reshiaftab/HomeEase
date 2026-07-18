import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

// Ensure upload directories exist
const ensureDirExists = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = "uploads/";

        if (file.fieldname === "police_certificate" || file.fieldname === "professional_certificate") {
            uploadPath = "uploads/certificates/";
        } else if (file.fieldname === "profile_picture") {
            uploadPath = "uploads/profile_pictures/";
        }

        // Ensure directory exists
        ensureDirExists(uploadPath);

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only JPG, PNG, and PDF files are allowed"));
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter
});

export default upload;