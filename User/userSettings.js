document.addEventListener('DOMContentLoaded', function () {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");

        // Redirect if no token found with SweetAlert
    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = "/index.html";
        });
        return;
    }

    // Logout logic with confirmation
    if (logoutLink) {
        logoutLink.addEventListener("click", function (e) {
            e.preventDefault();
            
            Swal.fire({
                title: 'Are you sure you want to logout?',
                text: "You will be logged out of your account.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Logout',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userRole");
                    Swal.fire(
                        'Logged Out!',
                        'You have been logged out successfully.',
                        'success'
                    ).then(() => {
                        window.location.href = "/index.html";
                    });
                }
            });
        });
    }

    if (!userId) {
        Swal.fire({
            icon: 'error',
            title: 'User ID not found',
            text: 'Please log in again.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    // Initial fetch
    fetchUserData(userId);

    // Handle sidebar menu switching
    setupSidebarSwitching();

    // Save profile form
    document.querySelector('.settings-form').addEventListener('submit', function (e) {
        e.preventDefault();
        saveChanges(userId);
    });

    // Change password form
    document.querySelector('.password-form').addEventListener('submit', function (e) {
        e.preventDefault();
        changePassword(userId);
    });

    // Password toggle icons
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
});

function setupSidebarSwitching() {
    const sidebarItems = document.querySelectorAll('.sidebar ul li');
    const profileSection = document.getElementById('profile-settings');
    const securitySection = document.getElementById('security-settings');
    const supportSection = document.getElementById('support-settings');
    const privacySection = document.getElementById('privacy-settings');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function () {
            // Reset active class
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Hide all
            profileSection.style.display = 'none';
            securitySection.style.display = 'none';
            supportSection.style.display = 'none';
            privacySection.style.display = 'none';

            const label = this.textContent.trim().toLowerCase();

            if (label.includes('profile')) {
                profileSection.style.display = 'block';
            } else if (label.includes('security')) {
                securitySection.style.display = 'block';
            } else if (label.includes('support')) {
                supportSection.style.display = 'block';
            } else if (label.includes('privacy')) {
                privacySection.style.display = 'block';
            }
        });
    });
}

async function fetchUserData(userId) {
    try {
        const response = await fetch(`https://ehs-deploy.vercel.app/api/users/${userId}`);
        const userData = await response.json();

        if (response.ok) {
            document.getElementById('first-name').value = userData.firstName || '';
            document.getElementById('last-name').value = userData.lastName || '';
            document.getElementById('email').value = userData.email || '';
            document.getElementById('phone').value = userData.phoneNumber || '';
            document.getElementById('address').value = userData.address || '';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: userData.error || 'Failed to fetch user data.',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Please try again later.',
            confirmButtonText: 'OK'
        });
    }
}

async function saveChanges(userId) {
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;

    const updatedData = {
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        address
    };

    try {
        const response = await fetch(`https://ehs-deploy.vercel.app/api/update-users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Profile Updated',
                text: 'Your profile has been updated successfully!',
                confirmButtonText: 'OK'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error || 'Failed to update profile.',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Please try again later.',
            confirmButtonText: 'OK'
        });
    }
}

async function changePassword(userId) {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
        return Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'Please fill out all password fields.',
            confirmButtonText: 'OK'
        });
    }

    try {
        const response = await fetch('https://ehs-deploy.vercel.app/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                oldPassword,
                newPassword,
                confirmPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Password Changed',
                text: result.message,
                confirmButtonText: 'OK'
            });

            // Clear fields
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Password Change Failed',
                text: result.error || 'Something went wrong',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Please try again later.',
            confirmButtonText: 'OK'
        });
    }
}