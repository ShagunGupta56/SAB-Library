
const form = document.getElementById("registrationForm");
const message = document.getElementById("message");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");

const submitButton = form.querySelector(
    'button[type="submit"], input[type="submit"]'
);

let isSubmitting = false;

const originalButtonText = submitButton
    ? submitButton.tagName === "INPUT"
        ? submitButton.value
        : submitButton.textContent
    : "";

// ==========================================
// MESSAGE DISPLAY
// ==========================================

function showMessage(text, type = "info") {
    message.textContent = text;

    message.style.display = "block";
    message.style.padding = "16px";
    message.style.marginTop = "16px";
    message.style.borderRadius = "12px";
    message.style.fontWeight = "600";
    message.style.lineHeight = "1.7";
    message.style.whiteSpace = "pre-line";
    message.style.textAlign = "center";
    message.style.border = "1px solid";

    const styles = {
        success: {
            background: "#e8f7ed",
            color: "#176b36",
            border: "#a8dfb8"
        },
        error: {
            background: "#fdecec",
            color: "#a61b1b",
            border: "#f1b1b1"
        },
        info: {
            background: "#eaf2ff",
            color: "#174a8b",
            border: "#b8d3ff"
        }
    };

    const selected = styles[type] || styles.info;

    message.style.backgroundColor = selected.background;
    message.style.color = selected.color;
    message.style.borderColor = selected.border;

    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
}

function setSubmitting(submitting) {
    isSubmitting = submitting;

    if (!submitButton) return;

    submitButton.disabled = submitting;

    if (submitButton.tagName === "INPUT") {
        submitButton.value = submitting
            ? "Submitting..."
            : originalButtonText;
    } else {
        submitButton.textContent = submitting
            ? "Submitting..."
            : originalButtonText;
    }
}

// ==========================================
// PHOTO PREVIEW
// ==========================================

let previewUrl = null;

function clearPhotoPreview() {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    photoPreview.removeAttribute("src");
    photoPreview.style.display = "none";
}

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    clearPhotoPreview();

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showMessage(
            "Please select a valid image.",
            "error"
        );

        photoInput.value = "";
        return;
    }

    previewUrl = URL.createObjectURL(file);

    photoPreview.src = previewUrl;
    photoPreview.style.display = "block";
});

// ==========================================
// IMAGE COMPRESSION
// ==========================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(
                        new Error("Unable to create image canvas.")
                    );
                    return;
                }

                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;

                let width = img.width;
                let height = img.height;

                if (
                    width > MAX_WIDTH ||
                    height > MAX_HEIGHT
                ) {
                    const ratio = Math.min(
                        MAX_WIDTH / width,
                        MAX_HEIGHT / height
                    );

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(
                    img,
                    0,
                    0,
                    width,
                    height
                );

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(
                                new Error(
                                    "Photo compression failed."
                                )
                            );
                            return;
                        }

                        const compressedFile = new File(
                            [blob],
                            "student-photo.jpg",
                            {
                                type: "image/jpeg"
                            }
                        );

                        resolve(compressedFile);
                    },
                    "image/jpeg",
                    0.75
                );
            };

            img.onerror = () => {
                reject(
                    new Error("Unable to process image.")
                );
            };

            img.src = event.target.result;
        };

        reader.onerror = () => {
            reject(
                new Error("Unable to read image.")
            );
        };

        reader.readAsDataURL(file);
    });
}

// ==========================================
// REGISTRATION
// ==========================================

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Prevent repeated clicks
    if (isSubmitting) return;

    const photo = photoInput.files[0];

    if (!photo) {
        showMessage(
            "Please add student photo.",
            "error"
        );
        return;
    }

    if (!photo.type.startsWith("image/")) {
        showMessage(
            "Please select a valid image.",
            "error"
        );
        return;
    }

    const fullName = document
        .getElementById("full_name")
        .value.trim()
        .replace(/\s+/g, " ");

    const phone = document
        .getElementById("phone")
        .value.trim();

    if (!fullName) {
        showMessage(
            "Please enter student's full name.",
            "error"
        );
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage(
            "Please enter a valid 10-digit phone number.",
            "error"
        );
        return;
    }

    setSubmitting(true);

    try {
        showMessage(
            "Preparing student photo...",
            "info"
        );

        const compressedPhoto = await compressImage(photo);

        const formData = new FormData();

        formData.append("full_name", fullName);

        formData.append(
            "father_name",
            document.getElementById("father_name")
                .value.trim()
        );

        formData.append("phone", phone);

        formData.append(
            "student_class",
            document.getElementById("student_class")
                .value.trim()
        );

        formData.append(
            "school_college",
            document.getElementById("school_college")
                .value.trim()
        );

        formData.append(
            "address",
            document.getElementById("address")
                .value.trim()
        );

        formData.append("photo", compressedPhoto);

        showMessage(
            "Submitting registration...\nPlease wait.",
            "info"
        );

        const response = await fetch(
            "/api/students/register",
            {
                method: "POST",
                body: formData
            }
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid server response");
        }

        if (response.ok) {
            const registrationId =
                data.studentId != null
                    ? String(data.studentId)
                    : "Not available";

            showMessage(
                "✅ Registration Successful!\n\n" +
                "Registration ID: " +
                registrationId +
                "\n\n" +
                "Your registration has been submitted " +
                "successfully and is pending admin approval.\n" +
                "Please save your Registration ID.",
                "success"
            );

            form.reset();
            clearPhotoPreview();

            // Bring confirmation into view
            message.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        } else if (response.status === 409) {
            showMessage(
                "⚠️ Already Registered!\n\n" +
                "A student with the same full name and " +
                "phone number is already registered.\n\n" +
                "Please contact the library admin " +
                "if you need assistance.",
                "error"
            );

            message.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        } else {
            showMessage(
                data.message ||
                "Registration failed. Please try again.",
                "error"
            );
        }

    } catch (error) {
        console.error("Registration error:", error);

        showMessage(
            "⚠️ Unable to confirm registration.\n\n" +
            "Please contact the library admin to check " +
            "whether your registration was received " +
            "before submitting again.",
            "error"
        );

    } finally {
        setSubmitting(false);
    }
});
