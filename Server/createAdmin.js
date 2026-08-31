require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function createAdmin() {

    const username = "admin";

    const plainPassword = "sab12345";

    const hashedPassword =
        await bcrypt.hash(plainPassword, 10);

    const sql = `
        INSERT INTO admins
        (username, password)
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [username, hashedPassword],
        (err) => {

            if (err) {
                console.log(err);
                process.exit();
            }

            console.log("Admin created successfully!");

            process.exit();
        }
    );
}

createAdmin();