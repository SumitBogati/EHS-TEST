// Handle signup form submission
document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.querySelector("#signup-overlay form");

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent default form submission

        const formData = {
            firstName: document.querySelector("#first-name").value,
            lastName: document.querySelector("#last-name").value,
            email: document.querySelector("#signup-email").value,
            phoneNumber: document.querySelector("#signup-phone").value,
            address: document.querySelector("#signup-address").value,
            password: document.querySelector("#signup-password").value,
            confirmPassword: document.querySelector("#signup-confirm-password").value,
        };

        try {
            const response = await fetch("https://ehs-deploy.vercel.app/api/signup", { 
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (responseData.errors) {
                    const errorMessages = responseData.errors.map(error => error.message).join("\n- ");
                    Swal.fire({
                        title: 'Validation Errors',
                        text: errorMessages,
                        icon: 'error',
                        confirmButtonText: 'Ok',
                        confirmButtonColor: '#1A73E8'
                    });
                } else if (responseData.error) {
                    Swal.fire({
                        title: 'Error',
                        text: responseData.error,
                        icon: 'error',
                        confirmButtonText: 'Ok',
                        confirmButtonColor: '#1A73E8'
                    });
                }
                return;
            }

            // Instead of immediately showing a success message, open the verification overlay
            toggleOverlay('verification');

            // Show success message with instructions to check email for the verification code
            Swal.fire({
                title: 'Verification Email Sent!',
                text: "Please check your email for the verification code.",
                icon: 'success',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#1A73E8'
            });

        } catch (error) {
            console.error("Error during signup:", error);
            Swal.fire({
                title: 'Unexpected Error',
                text: "An unexpected error occurred. Please try again later.",
                icon: 'error',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#1A73E8'
            });
        }
    });

    // Handle verification form submission
    const verificationForm = document.querySelector("#verification-form");

    verificationForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent default form submission

        const verificationCode = document.querySelector("#verification-code").value;

        try {
            const formData = {
                email: document.querySelector("#signup-email").value, // The email entered during signup
                code: verificationCode
            };

            const response = await fetch("https://ehs-deploy.vercel.app/api/verify-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                Swal.fire({
                    title: 'Error',
                    text: responseData.error || 'Verification failed. Please try again.',
                    icon: 'error',
                    confirmButtonText: 'Ok',
                    confirmButtonColor: '#1A73E8'
                });
                return;
            }

            // Successful verification
            Swal.fire({
                title: 'Email Verified!',
                text: responseData.message || 'Your email has been successfully verified.',
                icon: 'success',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#1A73E8'
            }).then(() => {
                // Save the JWT token and user info in local storage
                localStorage.setItem("token", responseData.token);
                localStorage.setItem("userRole", responseData.user.role);
                localStorage.setItem("userId", responseData.user.id);

                // Redirect user based on role after successful signup
                const userRole = responseData.user.role;
                // If the role is user, redirect to user service page
                if (userRole === 'user') {
                    window.location.href = "userService.html"; // Redirect to user page
                } else {
                    window.location.href = "/index.html"; // Default redirect if role is unknown or other roles
                }
            });
        } catch (error) {
            console.error("Error during verification:", error);
            Swal.fire({
                title: 'Unexpected Error',
                text: "An unexpected error occurred. Please try again later.",
                icon: 'error',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#1A73E8'
            });
        }
    });
});