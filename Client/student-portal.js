async function studentLogin() {

    const libraryId =
        document.getElementById("libraryId")
            .value
            .trim();

    const pin =
        document.getElementById("pin")
            .value
            .trim();

    const message =
        document.getElementById("message");


    if (!libraryId || !pin) {

        message.innerText =
            "Please enter Library ID and PIN.";

        return;
    }


    try {

        const response = await fetch(
            "/api/auth/student/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    library_id: libraryId,
                    pin: pin
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            message.innerText =
                data.message || "Login failed";

            return;
        }


        // Save student's JWT
        localStorage.setItem(
            "studentToken",
            data.token
        );


        // Open secure student dashboard
        window.location.href =
            "student-dashboard.html";


    } catch (error) {

        console.log(error);

        message.innerText =
            "Unable to connect to server.";
    }
}