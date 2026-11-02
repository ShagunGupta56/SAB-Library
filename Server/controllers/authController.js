const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==================== ADMIN LOGIN ====================
const adminLogin = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    const sql = "SELECT * FROM admins WHERE username = ?";

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error("Admin login database error:", err);

            return res.status(500).json({
                message: "Login failed"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        try {
            const admin = results[0];

            const isMatch = await bcrypt.compare(
                password,
                admin.password
            );

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }

            if (!process.env.JWT_SECRET) {
                console.error("JWT_SECRET is missing.");

                return res.status(500).json({
                    message: "Authentication configuration error"
                });
            }

            const token = jwt.sign(
                {
                    adminId: admin.id,
                    username: admin.username,
                    role: "admin"
                },
                process.env.JWT_SECRET,
                {
                    algorithm: "HS256",
                    expiresIn: "8h"
                }
            );

            return res.status(200).json({
                message: "Login successful",
                token
            });

        } catch (error) {
            console.error("Admin login error:", error);

            return res.status(500).json({
                message: "Login failed"
            });
        }
    });
};


// ==================== STUDENT LOGIN ====================
const studentLogin = (req, res) => {
    const { library_id, pin } = req.body;

    if (!library_id || !pin) {
        return res.status(400).json({
            message: "Library ID and PIN are required"
        });
    }

    const sql = `
        SELECT
            id,
            library_id,
            full_name,
            portal_pin_hash,
            status
        FROM students
        WHERE library_id = ?
    `;

    db.query(sql, [library_id], async (err, results) => {
        if (err) {
            console.error("Student login database error:", err);

            return res.status(500).json({
                message: "Student login failed"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid Library ID or PIN"
            });
        }

        try {
            const student = results[0];

            if (student.status !== "ACTIVE") {
                return res.status(403).json({
                    message: "Student account is not active"
                });
            }

            const isMatch = await bcrypt.compare(
                String(pin),
                student.portal_pin_hash
            );

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid Library ID or PIN"
                });
            }

            if (!process.env.JWT_SECRET) {
                console.error("JWT_SECRET is missing.");

                return res.status(500).json({
                    message: "Authentication configuration error"
                });
            }

            const token = jwt.sign(
                {
                    studentId: student.id,
                    libraryId: student.library_id,
                    role: "student"
                },
                process.env.JWT_SECRET,
                {
                    algorithm: "HS256",
                    expiresIn: "8h"
                }
            );

            return res.status(200).json({
                message: "Login successful",
                token,
                student: {
                    library_id: student.library_id,
                    full_name: student.full_name
                }
            });

        } catch (error) {
            console.error("Student login error:", error);

            return res.status(500).json({
                message: "Student login failed"
            });
        }
    });
};


module.exports = {
    adminLogin,
    studentLogin
};