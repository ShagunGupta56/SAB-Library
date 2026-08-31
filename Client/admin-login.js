async function adminLogin() {

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("loginMessage");

    if (!username || !password) {
        message.innerText =
            "Please enter username and password.";
        return;
    }

    try {

        const response = await fetch(
            "/api/auth/admin/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.innerText =
                data.message || "Login failed";
            return;
        }

        localStorage.setItem(
            "adminToken",
            data.token
        );

        window.location.href =
            "admin-dashboard.html";

    } catch (error) {

        console.log(error);

        message.innerText =
            "Unable to connect to server.";
    }
}