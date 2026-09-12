require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());


// ==========================================
// DATABASE CONNECTION
// ==========================================

require("./config/db");


// ==========================================
// ROUTES
// ==========================================

const studentRoutes =
    require("./routes/studentRoutes");

const adminRoutes =
    require("./routes/adminRoutes");

const seatRoutes =
    require("./routes/seatRoutes");

const membershipRoutes =
    require("./routes/membershipRoutes");

const authRoutes =
    require("./routes/authRoutes");

const paymentRoutes =
    require("./routes/paymentRoutes");    


app.use(
    "/api/students",
    studentRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/seats",
    seatRoutes
);

app.use(
    "/api/memberships",
    membershipRoutes
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/payments",
    paymentRoutes
);

// ==========================================
// UPLOAD ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {

    console.log(err);

    if (
        err.name === "MulterError" ||
        err.message ===
            "Only JPG, PNG or WEBP images are allowed"
    ) {

        return res.status(400).json({
            message:
                err.code === "LIMIT_FILE_SIZE"
                    ? "Photo must be smaller than 3 MB"
                    : err.message
        });
    }

    next(err);
});

// ==========================================
// SERVE FRONTEND
// ==========================================

const clientPath =
    path.join(
        __dirname,
        "../Client"
    );


app.use(
    express.static(clientPath)
);


// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `SAB Library running on port ${PORT}`
    );

});