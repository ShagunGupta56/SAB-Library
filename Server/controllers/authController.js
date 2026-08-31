const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
            console.log(err);

            return res.status(500).json({
                message: "Login failed"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

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

        const token = jwt.sign(
            {
                adminId: admin.id,
                username: admin.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token
        });
    });
};


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
            console.log(err);

            return res.status(500).json({
                message: "Student login failed"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid Library ID or PIN"
            });
        }

        const student = results[0];

        if (student.status !== "ACTIVE") {
            return res.status(403).json({
                message: "Student account is not active"
            });
        }

        try {

            const isMatch = await bcrypt.compare(
                String(pin),
                student.portal_pin_hash
            );

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid Library ID or PIN"
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
                    expiresIn: "8h"
                }
            );

            res.status(200).json({
                message: "Login successful",
                token,
                student: {
                    library_id: student.library_id,
                    full_name: student.full_name
                }
            });

        } catch (error) {

            console.log(error);

            res.status(500).json({
                message: "Student login failed"
            });
        }
    });
};

module.exports = {
    adminLogin,
    studentLogin 
};