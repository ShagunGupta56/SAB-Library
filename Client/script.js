const form = document.getElementById("registrationForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const studentData = {
        full_name: document.getElementById("full_name").value,
        father_name: document.getElementById("father_name").value,
        phone: document.getElementById("phone").value,
        student_class: document.getElementById("student_class").value,
        school_college: document.getElementById("school_college").value,
        address: document.getElementById("address").value
    };

    try {

        const response = await fetch(
            "/api/students/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(studentData)
            }
        );

        const data = await response.json();

        if (response.ok) {

            message.innerText =
                "Registration successful! Your request is pending approval.";

            form.reset();

        } else {

            message.innerText =
                data.message || "Registration failed";
        }

    } catch (error) {

        console.log(error);

        message.innerText =
            "Unable to connect to server.";
    }

});