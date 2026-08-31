const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
    adminLogin,
    studentLogin
} = require("../controllers/authController");


// ==========================================
// ADMIN LOGIN RATE LIMITER
// ==========================================

const adminLoginLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Too many admin login attempts. Please try again later."
    }
});


// ==========================================
// STUDENT LOGIN RATE LIMITER
// ==========================================

const studentLoginLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Too many login attempts. Please try again later."
    }
});


// ==========================================
// AUTH ROUTES
// ==========================================

router.post(
    "/admin/login",
    adminLoginLimiter,
    adminLogin
);


router.post(
    "/student/login",
    studentLoginLimiter,
    studentLogin
);


module.exports = router;