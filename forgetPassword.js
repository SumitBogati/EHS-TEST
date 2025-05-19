// Global variables
let emailForReset = '';

// Step 1: Handle the request for the verification code
const requestVerificationCode = async () => {
    const emailInput = document.getElementById('forgot-password-email');
    emailForReset = emailInput.value;

    if (!emailForReset) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please enter your email address.',
        });
        return;
    }

    try {
        const response = await fetch('https://ehs-deploy-sooty.vercel.app/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailForReset })
        });

        const result = await response.json();

        if (response.status === 200) {
            Swal.fire({
                icon: 'success',
                title: 'Verification code sent!',
                text: result.message,
            });
            showVerificationStep();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error,
            });
        }
    } catch (error) {
        console.error('Error requesting verification code:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error requesting verification code. Please try again later.',
        });
    }
};

// Step 2: Show the verification step after email is submitted
const showVerificationStep = () => {
    document.getElementById('forgot-password-form').style.display = 'none';
    const verificationStep = document.getElementById('verification-step');
    verificationStep.style.display = 'block';
    verificationStep.classList.add('show');
};

// Step 3: Verify the reset code and reset the password
const verifyResetCode = async () => {
    const codeInput = document.getElementById('verification-code');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');

    const code = codeInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!code || !newPassword || !confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please fill in all fields.',
        });
        return;
    }

    if (newPassword !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Passwords do not match.',
        });
        return;
    }

    try {
        const response = await fetch('https://ehs-deploy-sooty.vercel.app/api/verify-reset-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailForReset,
                code: code,
                newPassword: newPassword,
                confirmNewPassword: confirmPassword
            })
        });

        const result = await response.json();

        if (response.status === 200) {
            Swal.fire({
                icon: 'success',
                title: 'Password Reset Success!',
                text: result.message,
            }).then(() => {
                // Redirect to index.html after successful reset
                window.location.href = 'index.html';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error,
            });
        }
    } catch (error) {
        console.error('Error verifying reset code:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error verifying reset code. Please try again later.',
        });
    }
};

// Reset the page
const resetPage = () => {
    document.getElementById('forgot-password-form').reset();
    document.getElementById('verification-step').reset();
    document.getElementById('forgot-password-form').style.display = 'block';
    document.getElementById('verification-step').style.display = 'none';
};

// Toggle password visibility function
const togglePassword = (passwordFieldId) => {
    const passwordField = document.getElementById(passwordFieldId);
    const eyeIcon = document.getElementById(passwordFieldId + '-eye');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordField.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// Event Listeners
document.getElementById('request-verification-btn').addEventListener('click', requestVerificationCode);
document.getElementById('verify-reset-code-btn').addEventListener('click', verifyResetCode);