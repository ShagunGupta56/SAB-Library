const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({

    storage,

    // Maximum file accepted by backend = 5 MB
    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {

            return cb(
                new Error(
                    "Only JPG, PNG or WEBP images are allowed"
                )
            );
        }

        cb(null, true);
    }
});

module.exports = upload;