require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

const newPassword = process.env.NEW_ADMIN_PASSWORD;

if (!newPassword) {
    console.log("NEW_ADMIN_PASSWORD is missing.");
    process.exit(1);
}

bcrypt.hash(newPassword, 12, (err, hash) => {

    if (err) {
        console.log(err);
        process.exit(1);
    }

    const sql = `
        UPDATE admins
        SET password = ?
        WHERE username = 'admin'
    `;

    db.query(sql, [hash], (err, result) => {

        if (err) {
            console.log(err);
            process.exit(1);
        }

        console.log(
            "Admin password changed successfully."
        );

        db.end();
    });
});