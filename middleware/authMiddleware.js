import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // store user info
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        } else {
            return res.status(401).json({ message: "Invalid token" });
        }
    }
};

export default authMiddleware;