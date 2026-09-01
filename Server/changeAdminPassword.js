require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

const newPassword =
    process.env.NEW_ADMIN_PASSWORD;

if (!newPassword) {

    console.log(
        "NEW_ADMIN_PASSWORD is missing."
    );

    process.exit(1);
}


bcrypt.hash(
    newPassword,
    12,
    (err, hash) => {

        if (err) {

            console.log(err);

            process.exit(1);
        }


        const sql = `
            INSERT INTO admins (
                username,
                password
            )
            VALUES ('admin', ?)

            ON DUPLICATE KEY UPDATE
                password = VALUES(password)
        `;


        db.query(
            sql,
            [hash],
            (err) => {

                if (err) {

                    console.log(err);

                    process.exit(1);
                }


                console.log(
                    "Admin created / password updated successfully."
                );


                db.end();
            }
        );
    }
);