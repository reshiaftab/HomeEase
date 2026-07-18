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
        const { name, email, password, phone, role, cnic, province, city, service_category } = req.body;

        // Detect provider signup automatically if certificates are uploaded
        const isProviderSignup = !!(req.files?.police_certificate || req.files?.professional_certificate);

        // -----------------
        // Basic Validation
        // -----------------
        if (!name || name.trim().length < 3) 
            return res.status(400).json({ message: "Name must be at least 3 characters" });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) 
            return res.status(400).json({ message: "Invalid email" });

        if (!phone || phone.length < 10) 
            return res.status(400).json({ message: "Invalid phone number" });

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!password || !passwordRegex.test(password)) 
            return res.status(400).json({ message: "Password must be min 8 chars with uppercase, lowercase, number, special char" });

        if (!["resident", "provider", "admin"].includes(role) && !isProviderSignup) 
            return res.status(400).json({ message: "Invalid role" });

        // -----------------
        // Provider-specific validation
        // -----------------
        let police_certificate = null;
        let professional_certificate = null;
        let profile_picture = null;

        if (isProviderSignup) {
            if (!cnic) return res.status(400).json({ message: "CNIC is required" });
            if (!province || !city) return res.status(400).json({ message: "Province and city are required" });
            if (!service_category) return res.status(400).json({ message: "Service category is required" });

            const provinces = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Gilgit-Baltistan", "Islamabad"];
            const cities = {
                "Punjab": ["Lahore","Rawalpindi","Faisalabad"],
                "Sindh": ["Karachi","Hyderabad","Sukkur"],
                "Khyber Pakhtunkhwa": ["Peshawar","Mardan"],
                "Balochistan": ["Quetta","Gwadar"],
                "Gilgit-Baltistan": ["Gilgit","Skardu"],
                "Islamabad": ["Islamabad"]
            };

            if (!provinces.includes(province)) return res.status(400).json({ message: "Invalid province" });
            if (!cities[province].includes(city)) return res.status(400).json({ message: "Invalid city for selected province" });

            // Certificates
            if (!req.files?.police_certificate || !req.files?.professional_certificate) {
                return res.status(400).json({ message: "Provider must upload police and professional certificates" });
            }

            police_certificate = req.files.police_certificate[0].filename;
            professional_certificate = req.files.professional_certificate[0].filename;
            if (req.file) profile_picture = req.file.filename;
        }

        // -----------------
        // Check existing user by email or CNIC
        // -----------------
        const existingUser = await User.findOne({ 
            where: isProviderSignup ? { [Op.or]: [{ email }, { cnic }] } : { email } 
        });
        if (existingUser) return res.status(400).json({ message: "Email or CNIC already registered" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // -----------------
        // Create User
        // -----------------
        const newUser = await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            phone,
            role: isProviderSignup ? "provider" : role,
            cnic: isProviderSignup ? cnic : null,
            province: isProviderSignup ? province : null,
            city: isProviderSignup ? city : null,
            service_category: isProviderSignup ? service_category : null,
            police_certificate,
            professional_certificate,
            profile_picture,
            approval_status: isProviderSignup ? "pending" : "approved",
            submitted_at: isProviderSignup ? new Date() : null
        });

        res.status(201).json({
            message: isProviderSignup 
                ? "Provider registered successfully. Waiting admin approval." 
                : "User registered successfully",
            user: {
                id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                approval_status: newUser.approval_status,
                service_category: newUser.service_category
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
                approval_status: user.approval_status,
                service_category: user.service_category
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

        // Generate 4-digit PIN
        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        user.reset_password_token = pin; // store PIN instead of token
        user.reset_password_expires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send PIN via email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        await transporter.sendMail({
            from: `"HomeEase Support" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Password Reset PIN",
            html: `<p>Hello ${user.name},</p>
                   <p>You requested a password reset. Use the PIN below to reset your password:</p>
                   <h2>${pin}</h2>
                   <p>Expires in 1 hour.</p>`
        });

        res.status(200).json({ message: "Password reset PIN sent to your email" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/auth/verify-pin
export const verifyPin = async (req, res) => {
    try {
        const { email, pin } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required" });
        if (!pin) return res.status(400).json({ message: "PIN is required" });

        const user = await User.findOne({
            where: {
                email,
                reset_password_token: pin,
                reset_password_expires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) return res.status(400).json({ success: false, message: "Invalid or expired PIN" });

        // Return success without revealing password or token
        res.status(200).json({ success: true, message: "PIN is valid" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/auth/update-password
export const updatePassword = async (req, res) => {
    try {
        const { email, pin, newPassword } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required" });
        if (!pin) return res.status(400).json({ message: "PIN is required" });
        if (!newPassword) return res.status(400).json({ message: "New password is required" });

        const user = await User.findOne({
            where: {
                email,
                reset_password_token: pin,
                reset_password_expires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired PIN" });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.reset_password_token = null;
        user.reset_password_expires = null;

        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};