import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import User from "../models/User.js";

// =========================
// REGISTER
// =========================
export const register = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Validation
        if (!name || name.trim().length < 3) return res.status(400).json({ message: "Name must be at least 3 characters" });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) return res.status(400).json({ message: "Invalid email" });
        if (!phone || phone.length < 10) return res.status(400).json({ message: "Invalid phone number" });
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!password || !passwordRegex.test(password)) return res.status(400).json({ message: "Password must be min 8 chars with uppercase, lowercase, number, special char" });
        if (!["resident", "provider", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });

        // Check existing user
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: "Email already registered" });

        // Provider documents
        let police_certificate = null;
        let professional_certificate = null;
        if (role === "provider") {
            if (!req.files?.police_certificate || !req.files?.professional_certificate) {
                return res.status(400).json({ message: "Provider must upload police and professional certificates" });
            }
            police_certificate = req.files.police_certificate[0].filename;
            professional_certificate = req.files.professional_certificate[0].filename;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            phone,
            role,
            police_certificate,
            professional_certificate,
            approval_status: role === "provider" ? "pending" : "approved",
            submitted_at: role === "provider" ? new Date() : null
        });

        res.status(201).json({
            message: role === "provider" ? "Provider registered successfully. Waiting admin approval." : "User registered successfully",
            user: {
                id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                approval_status: newUser.approval_status
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =========================
// LOGIN
// =========================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.role === "provider" && user.approval_status !== "approved") {
            return res.status(403).json({ message: "Provider account is pending admin approval" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

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
        res.status(500).json({ error: error.message });
    }
};

// =========================
// FORGOT PASSWORD
// =========================
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const token = crypto.randomBytes(32).toString("hex"); // stronger token
        user.reset_password_token = token;
        user.reset_password_expires = Date.now() + 3600000; // 1 hour
        await user.save();

        // SMTP email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        await transporter.sendMail({
            from: `"HomeEase Support" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>Hello ${user.name},</p>
                   <p>You requested a password reset. Click the link below:</p>
                   <a href="${resetUrl}">Reset Password</a>
                   <p>Expires in 1 hour.</p>`
        });

        res.status(200).json({ message: "Password reset link sent to your email" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =========================
// RESET PASSWORD
// =========================
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            where: {
                reset_password_token: token,
                reset_password_expires: { [Op.gt]: Date.now() } // Use Sequelize Op
            }
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.reset_password_token = null;
        user.reset_password_expires = null;

        await user.save();

        res.status(200).json({ message: "Password has been reset successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};