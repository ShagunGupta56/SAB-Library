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