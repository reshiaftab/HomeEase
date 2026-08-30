import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

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

        ensureDirExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${extension}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf"
    ];

    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf"
    ];

    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    if (allowedExtensions.includes(extension) && allowedMimeTypes.includes(mimeType)) {
        return cb(null, true);
    }

    if (allowedExtensions.includes(extension)) {
        return cb(null, true);
    }

    return cb(new Error("Only JPG, JPEG, PNG, and PDF files are allowed"));
};

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter
});

export default upload;