const form =
    document.getElementById("registrationForm");

const message =
    document.getElementById("message");

const photoInput =
    document.getElementById("photo");

const photoPreview =
    document.getElementById("photoPreview");


// ==========================================
// PHOTO PREVIEW
// ==========================================

photoInput.addEventListener(
    "change",
    () => {

        const file =
            photoInput.files[0];

        if (!file) {

            photoPreview.style.display =
                "none";

            return;
        }


        // Check that selected file is an image
        if (!file.type.startsWith("image/")) {

            message.innerText =
                "Please select a valid image.";

            photoInput.value = "";

            photoPreview.style.display =
                "none";

            return;
        }


        const imageUrl =
            URL.createObjectURL(file);


        photoPreview.src =
            imageUrl;

        photoPreview.style.display =
            "block";
    }
);


// ==========================================
// IMAGE COMPRESSION
// ==========================================

function compressImage(file) {

    return new Promise((resolve, reject) => {

        const reader =
            new FileReader();

        reader.readAsDataURL(file);


        reader.onload = (event) => {

            const img =
                new Image();


            img.src =
                event.target.result;


            img.onload = () => {

                const canvas =
                    document.createElement("canvas");

                const ctx =
                    canvas.getContext("2d");


                // Maximum image dimensions
                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;


                let width =
                    img.width;

                let height =
                    img.height;


                // Resize while keeping aspect ratio
                if (
                    width > MAX_WIDTH ||
                    height > MAX_HEIGHT
                ) {

                    const ratio =
                        Math.min(
                            MAX_WIDTH / width,
                            MAX_HEIGHT / height
                        );


                    width =
                        Math.round(width * ratio);

                    height =
                        Math.round(height * ratio);
                }


                canvas.width =
                    width;

                canvas.height =
                    height;


                ctx.drawImage(
                    img,
                    0,
                    0,
                    width,
                    height
                );


                // Convert to compressed JPEG
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


                        const compressedFile =
                            new File(
                                [blob],
                                "student-photo.jpg",
                                {
                                    type: "image/jpeg"
                                }
                            );


                        resolve(
                            compressedFile
                        );

                    },

                    "image/jpeg",

                    0.75
                );
            };


            img.onerror = () => {

                reject(
                    new Error(
                        "Unable to process image."
                    )
                );
            };
        };


        reader.onerror = () => {

            reject(
                new Error(
                    "Unable to read image."
                )
            );
        };
    });
}


// ==========================================
// REGISTRATION
// ==========================================

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const photo =
            photoInput.files[0];


        if (!photo) {

            message.innerText =
                "Please add student photo.";

            return;
        }


        try {

            message.innerText =
                "Preparing photo...";


            // Compress selected image
            const compressedPhoto =
                await compressImage(photo);


            console.log(
                "Original photo:",
                (
                    photo.size /
                    1024 /
                    1024
                ).toFixed(2),
                "MB"
            );


            console.log(
                "Compressed photo:",
                (
                    compressedPhoto.size /
                    1024 /
                    1024
                ).toFixed(2),
                "MB"
            );


            const formData =
                new FormData();


            formData.append(
                "full_name",
                document.getElementById(
                    "full_name"
                ).value.trim()
            );


            formData.append(
                "father_name",
                document.getElementById(
                    "father_name"
                ).value.trim()
            );


            formData.append(
                "phone",
                document.getElementById(
                    "phone"
                ).value.trim()
            );


            formData.append(
                "student_class",
                document.getElementById(
                    "student_class"
                ).value
            );


            formData.append(
                "school_college",
                document.getElementById(
                    "school_college"
                ).value.trim()
            );


            formData.append(
                "address",
                document.getElementById(
                    "address"
                ).value.trim()
            );


            // IMPORTANT:
            // Send compressed photo instead of original photo
            formData.append(
                "photo",
                compressedPhoto
            );


            message.innerText =
                "Submitting registration...";


            const response =
                await fetch(
                    "/api/students/register",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await response.json();


            if (response.ok) {

                message.innerText =
                    "Registration successful! Your request is pending approval.";


                form.reset();


                photoPreview.src =
                    "";

                photoPreview.style.display =
                    "none";

            } else {

                message.innerText =
                    data.message ||
                    "Registration failed";
            }


        } catch (error) {

            console.log(error);


            message.innerText =
                "Unable to submit registration. Please try again.";
        }
    }
);