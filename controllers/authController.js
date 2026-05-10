import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// REGISTER
export const register = async (req, res) => {
    try {

        const { name, email, password, phone, role } = req.body;

        // ===== VALIDATIONS =====

        if (!name || name.trim().length < 3) {
            return res.status(400).json({
                message: "Name must be at least 3 characters long"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (!phone || phone.length < 10) {
            return res.status(400).json({
                message: "Phone number must be at least 10 digits"
            });
        }

        const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                "Password must be at least 8 characters and include uppercase, lowercase, number and special character"
            });
        }

        if (!["resident", "provider", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // ===== CHECK EXISTING USER =====

        const existingUser = await User.findOne({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        // ===== PROVIDER DOCUMENT VALIDATION =====

        if (role === "provider") {

            if (!req.files ||
                !req.files.police_certificate ||
                !req.files.professional_certificate
            ) {
                return res.status(400).json({
                    message:
                    "Providers must upload Police Character Certificate and Professional Certificate"
                });
            }

        }

        // ===== HASH PASSWORD =====

        const hashedPassword = await bcrypt.hash(password, 10);

        // ===== CREATE USER =====

        const newUser = await User.create({

            name: name.trim(),
            email,
            password: hashedPassword,
            phone,
            role,

            police_certificate: role === "provider"
                ? req.files.police_certificate[0].filename
                : null,

            professional_certificate: role === "provider"
                ? req.files.professional_certificate[0].filename
                : null,

            approval_status: role === "provider"
                ? "pending"
                : "approved",

            submitted_at: role === "provider"
                ? new Date()
                : null

        });

        // ===== RESPONSE =====

        res.status(201).json({
            message:
            role === "provider"
            ? "Provider registered successfully. Waiting for admin approval."
            : "User registered successfully",

            user: {
                id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                approval_status: newUser.approval_status
            }

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
};


// LOGIN
export const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        // ===== PROVIDER APPROVAL CHECK =====

        if (user.role === "provider" && user.approval_status !== "approved") {

            return res.status(403).json({
                message: "Provider account is pending admin approval"
            });

        }

        // ===== PASSWORD CHECK =====

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {

            return res.status(400).json({
                message: "Invalid credentials"
            });

        }

        // ===== TOKEN =====

        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // ===== RESPONSE =====

        res.status(200).json({
            message: "Login successful",
            token,

            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                approval_status: user.approval_status
            }

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

};