import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import User from "../models/User.js";
import Service from "../models/Service.js";
import { createNotification } from "./notificationController.js";

// =========================
// REGISTER
// =========================
export const register = async (req, res) => {
    try {
        const { name, email, password, phone, role, cnic, province, city, service_category, provider_address } = req.body;
        const isProviderSignup = role === "provider";

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

        if (!["resident", "provider", "admin"].includes(role))
            return res.status(400).json({ message: "Invalid role" });

        let police_certificate = null;
        let professional_certificate = null;
        let profile_picture = null;

        if (isProviderSignup) {
            if (!cnic)
                return res.status(400).json({ message: "CNIC is required" });

            if (!province || !city)
                return res.status(400).json({ message: "Province and city are required" });

            if (!service_category)
                return res.status(400).json({ message: "Service category is required" });

            if (!provider_address || provider_address.trim().length < 5)
                return res.status(400).json({ message: "Provider address is required and must be at least 5 characters" });

            const provinces = [
                "Punjab",
                "Sindh",
                "Khyber Pakhtunkhwa",
                "Balochistan",
                "Gilgit-Baltistan",
                "Islamabad"
            ];

            const cities = {
                "Punjab": ["Lahore","Faisalabad","Rawalpindi","Multan","Gujranwala","Sialkot","Gujrat","Bahawalpur","Sargodha","Sahiwal","Jhang","Sheikhupura","Rahim Yar Khan","Kasur","Mianwali","Attock","Jhelum","Okara","Dera Ghazi Khan","Chiniot","Toba Tek Singh","Hafizabad","Mandi Bahauddin","Nankana Sahib","Pakpattan","Vehari","Lodhran","Khanewal","Muzaffargarh","Layyah","Bhakkar","Khushab","Narowal","Murree","Taxila","Wah Cantonment"],
                "Sindh": ["Karachi","Hyderabad","Sukkur","Larkana","Nawabshah","Mirpur Khas","Jacobabad","Shikarpur","Dadu","Khairpur","Thatta","Badin","Tando Allahyar","Tando Muhammad Khan","Ghotki","Kashmore","Sanghar","Umerkot","Tharparkar","Jamshoro","Kotri","Matiari","Qambar Shahdadkot"],
                "Khyber Pakhtunkhwa": ["Peshawar","Mardan","Abbottabad","Mingora","Swat","Nowshera","Kohat","Dera Ismail Khan","Mansehra","Haripur","Charsadda","Swabi","Bannu","Chitral","Timergara","Dir","Tank","Hangu","Karak","Batkhela","Parachinar"],
                "Balochistan": ["Quetta","Gwadar","Turbat","Khuzdar","Chaman","Zhob","Sibi","Dera Murad Jamali","Nasirabad","Lasbela","Hub","Uthal","Mastung","Pishin","Killa Saifullah","Loralai","Barkhan","Musakhel","Panjgur","Kech","Pasni","Ormara","Sohbatpur","Jaffarabad","Kalāt"],
                "Gilgit-Baltistan": ["Gilgit","Skardu","Hunza","Chilas","Ghizer","Ghanche","Khaplu","Astore","Diamer","Kharmang","Shigar","Nagar","Yasin"],
                "Islamabad": ["Islamabad"]
            };

            if (!provinces.includes(province))
                return res.status(400).json({ message: "Invalid province" });

            if (!cities[province].includes(city))
                return res.status(400).json({ message: "Invalid city for selected province" });

            if (!req.files?.police_certificate || !req.files?.professional_certificate)
                return res.status(400).json({ message: "Provider must upload police and professional certificates" });

            police_certificate = req.files.police_certificate[0].filename;
            professional_certificate = req.files.professional_certificate[0].filename;

            if (req.files?.profile_picture?.[0]) {
                profile_picture = req.files.profile_picture[0].filename;
            } else if (req.file) {
                profile_picture = req.file.filename;
            }
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            where: isProviderSignup
                ? { [Op.or]: [{ email: normalizedEmail }, { cnic }] }
                : { email: normalizedEmail }
        });

        if (existingUser)
            return res.status(400).json({ message: "Email or CNIC already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: isProviderSignup ? "provider" : role,
            cnic: isProviderSignup ? cnic : null,
            province: isProviderSignup ? province : null,
            city: isProviderSignup ? city : null,
            service_category: isProviderSignup ? service_category.trim() : null,
            provider_address: isProviderSignup ? provider_address.trim() : null,
            police_certificate,
            professional_certificate,
            profile_picture,
            approval_status: isProviderSignup ? "pending" : "approved",
            submitted_at: isProviderSignup ? new Date() : null
        });

        // Automatically create a service for the provider
        if (isProviderSignup) {
        await Service.create({
        provider_id: newUser.user_id,
        title: service_category.trim(),
        price: 0,
        location: city
        });
        }

        const admin = await User.findOne({
            where: {
                role: "admin"
            }
        });

        if (admin) {
            if (isProviderSignup) {
                await createNotification(
                    admin.user_id,
                    "general",
                    `New provider registration received from ${newUser.name}. Awaiting admin approval.`
                );
            } else {
                await createNotification(
                    admin.user_id,
                    "general",
                    `New resident ${newUser.name} has registered.`
                );
            }
        }

        // Issue a session token right away. A pending provider is allowed a
        // limited session (they are blocked from the app by the approval
        // screen) so they can poll their approval status without a 401.
        const token = jwt.sign(
            {
                id: newUser.user_id,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(201).json({
            message: isProviderSignup
                ? "Provider registered successfully. Waiting admin approval."
                : "User registered successfully",
            token,
            user: {
                id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                approval_status: newUser.approval_status,
                service_category: newUser.service_category,
                provider_address: newUser.provider_address,
                price: isProviderSignup ? 0 : undefined
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
};

// =========================
// LOGIN
// =========================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "Email and password required" });

        const user = await User.findOne({
            where: {
                email: email.trim().toLowerCase()
            }
        });

        if (!user)
            return res.status(400).json({ message: "User not found" });

        // Rejected providers are blocked entirely. Pending providers ARE
        // allowed to log in (they receive a token) so the app can keep them
        // on the "waiting for admin approval" screen until approved.
        if (user.role === "provider" && user.approval_status === "rejected") {
            return res.status(403).json({
                message: "Your provider account was rejected. Please contact support."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            {
                id: user.user_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        let price = undefined;

        if (user.role === "provider") {
            const service = await Service.findOne({
                where: {
                    provider_id: user.user_id
                },
                attributes: ["price"]
            });

            price = service ? service.price : null;
        }

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                approval_status: user.approval_status,
                service_category: user.service_category,
                provider_address: user.provider_address,
                price
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

        if (!email)
            return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({
            where: {
                email: email.toLowerCase()
            }
        });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        user.reset_password_token = pin;
        user.reset_password_expires = Date.now() + 3600000;

        await user.save();

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
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

        res.status(200).json({
            message: "Password reset PIN sent to your email"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =========================
// VERIFY PIN
// =========================
export const verifyPin = async (req, res) => {
    try {
        const { email, pin } = req.body;

        if (!email)
            return res.status(400).json({ message: "Email is required" });

        if (!pin)
            return res.status(400).json({ message: "PIN is required" });

        const user = await User.findOne({
            where: {
                email: email.toLowerCase(),
                reset_password_token: pin,
                reset_password_expires: {
                    [Op.gt]: Date.now()
                }
            }
        });

        if (!user)
            return res.status(400).json({
                success: false,
                message: "Invalid or expired PIN"
            });

        res.status(200).json({
            success: true,
            message: "PIN is valid"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =========================
// UPDATE PASSWORD
// =========================
export const updatePassword = async (req, res) => {
    try {
        const { email, pin, newPassword, confirmPassword } = req.body;

        if (!email)
            return res.status(400).json({ message: "Email is required" });

        if (!pin)
            return res.status(400).json({ message: "PIN is required" });

        if (!newPassword)
            return res.status(400).json({ message: "New password is required" });

        if (!confirmPassword)
            return res.status(400).json({ message: "Confirm password is required" });

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New password and confirm password do not match"
            });
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must be min 8 chars with uppercase, lowercase, number, special char"
            });
        }

        const user = await User.findOne({
            where: {
                email: email.toLowerCase(),
                reset_password_token: pin,
                reset_password_expires: {
                    [Op.gt]: Date.now()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired PIN"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.reset_password_token = null;
        user.reset_password_expires = null;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};