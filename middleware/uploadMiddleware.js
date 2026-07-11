import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "police_certificate" || file.fieldname === "professional_certificate") {
            cb(null, "uploads/certificates/");
        } else if (file.fieldname === "profile_picture") {
            cb(null, "uploads/profile_pictures/");
        } else {
            cb(null, "uploads/");
        }
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
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter
});

export default upload;