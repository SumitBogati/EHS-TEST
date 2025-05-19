document.addEventListener('DOMContentLoaded', function () {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");
    const staffNameDisplay = document.getElementById('staffName');
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const passwordModal = document.getElementById("passwordModal");
    const cancelPasswordChange = document.getElementById("cancelPasswordChange");
    const submitPasswordChange = document.getElementById("submitPasswordChange");
    
    // Active menu item highlighting
    const currentPage = window.location.pathname.split("/").pop();
    const menuItems = document.querySelectorAll('.sidebar ul li a');
    
    menuItems.forEach(item => {
        if (item.getAttribute('href').includes(currentPage)) {
            item.parentElement.classList.add('active');
        } else {
            item.parentElement.classList.remove('active');
        }
    });

    // Redirect if no token or incorrect role with SweetAlert
    if (!token || !userId || userRole !== 'staff') {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login as a staff member to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = "/index.html";
        });
        return;
    }

    // Logout logic with confirmation and ttesting
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

    // Set default staff name display
    staffNameDisplay.textContent = 'Staff';

    // Fetch and display staff data
    fetchStaffData(userId);
});

changePasswordBtn.addEventListener("click", () => {
    passwordModal.classList.remove("hidden");
});

cancelPasswordChange.addEventListener("click", () => {
    passwordModal.classList.add("hidden");
}); 

async function fetchStaffData(userId) {
    try {
        const response = await fetch(`https://ehs-deploy-sooty.vercel.app/api/staff/${userId}`);
        const staffData = await response.json();

        if (response.ok) {
            document.getElementById('username').value = staffData.name || '';
            document.getElementById('phone').value = staffData.phone || '';
            document.getElementById('address').value = staffData.address || '';
            document.getElementById('category').value = staffData.categoryId?.name || staffData.category || '';
            document.getElementById('image-preview').src = staffData.image ? `https://ehs-deploy-sooty.vercel.app/${staffData.image}` : '/Image/default-staff.png';
            document.getElementById('staffName').textContent = staffData.name || 'Staff';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: staffData.error || 'Failed to fetch staff data.',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error fetching staff data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'Please try again later.',
            confirmButtonText: 'OK'
        });
    }
}

submitPasswordChange.addEventListener("click", async () => {
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Frontend validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        Swal.fire("Error", "All fields are required", "error");
        return;
    }

    if (newPassword.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        Swal.fire("Error", "New password must be at least 8 characters and include a special character.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        Swal.fire("Error", "New and confirm password do not match.", "error");
        return;
    }

    try {
        const response = await fetch("https://ehs-deploy-sooty.vercel.app/api/update-staff-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
                staffId: localStorage.getItem("userId"),
                phone: document.getElementById("phone").value,
                oldPassword,
                newPassword,
                confirmPassword,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire("Success", data.message, "success");
            passwordModal.classList.add("hidden");
        } else {
            Swal.fire("Error", data.error || "Password update failed", "error");
        }
    } catch (error) {
        console.error("Password change error:", error);
        Swal.fire("Error", "Something went wrong", "error");
    }
});

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
        const inputId = icon.getAttribute('data-target');
        const input = document.getElementById(inputId);
        const isPassword = input.type === 'password';

        input.type = isPassword ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
});