import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // store user info
        next();

    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export default authMiddleware;
