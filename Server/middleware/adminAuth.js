const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            message: "Access denied. Login required."
        });
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        // Only admin tokens can access admin routes
        if (
            decoded.role !== "admin" ||
            !decoded.adminId
        ) {
            return res.status(403).json({
                message: "Admin access only."
            });
        }

        req.admin = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

module.exports = adminAuth;