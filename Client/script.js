const form =
    document.getElementById(
        "registrationForm"
    );

const message =
    document.getElementById(
        "message"
    );

const photoInput =
    document.getElementById(
        "photo"
    );

const photoPreview =
    document.getElementById(
        "photoPreview"
    );


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


        const imageUrl =
            URL.createObjectURL(file);


        photoPreview.src =
            imageUrl;

        photoPreview.style.display =
            "block";
    }
);


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


        const formData =
            new FormData();


        formData.append(
            "full_name",
            document.getElementById(
                "full_name"
            ).value
        );


        formData.append(
            "father_name",
            document.getElementById(
                "father_name"
            ).value
        );


        formData.append(
            "phone",
            document.getElementById(
                "phone"
            ).value
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
            ).value
        );


        formData.append(
            "address",
            document.getElementById(
                "address"
            ).value
        );


        formData.append(
            "photo",
            photo
        );


        try {

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


                photoPreview.src = "";

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
                "Unable to connect to server.";
        }
    }
);