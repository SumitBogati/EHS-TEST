document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector(".search-input");
    const userTableBody = document.getElementById("userPartTableBody");
    const noDataRow = document.getElementById("noDataRow");
    const paginationControls = document.getElementById("paginationControls");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageNumber = document.getElementById("pageNumber");
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");

    let currentPage = 1;
    const usersPerPage = 6;
    let allUsers = [];

    // Redirect if no token found with SweetAlert
    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = "/src/Frontend/index.html";
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
                        window.location.href = "/src/Frontend/index.html";
                    });
                }
            });
        });
    }

    // Fetch Users Function
    function fetchUsers(searchQuery = "") {
        fetch("https://ehs-deploy.vercel.app/api/users")
            .then(response => response.json())
            .then(users => {
                allUsers = users;
                let filteredUsers = users;

                if (searchQuery) {
                    filteredUsers = users.filter(user =>
                        (user.firstName + ' ' + user.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }

                const startIndex = (currentPage - 1) * usersPerPage;
                const endIndex = startIndex + usersPerPage;
                const usersToDisplay = filteredUsers.slice(startIndex, endIndex);

                updateUserTable(usersToDisplay, startIndex);
                updatePaginationControls(filteredUsers.length);

                if (filteredUsers.length === 0) {
                    noDataRow.style.display = "block";
                    paginationControls.style.display = "none";
                } else {
                    noDataRow.style.display = "none";
                    paginationControls.style.display = "block";
                }
            })
            .catch(error => {
                console.error("Error fetching users:", error);
                alert("Error loading users data.");
                noDataRow.style.display = "block";
                paginationControls.style.display = "none";
            });
    }

    // Update User Table Function
    function updateUserTable(users, startIndex) {
        userTableBody.innerHTML = "";

        users.forEach((user, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="user-name">
                        <span>${user.firstName} ${user.lastName}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.phoneNumber}</td>
                <td>${user.address}</td>
                <td>
                    <div class="actions-container">
                        <button class="delete-button" data-id="${user._id}">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        attachDeleteListeners();
    }

    // Attach Delete Button Listeners
    function attachDeleteListeners() {
        document.querySelectorAll(".delete-button").forEach(button => {
            button.addEventListener("click", function () {
                const userId = button.getAttribute("data-id");
                deleteUser(userId);
            });
        });
    }

    // Delete User Function
    function deleteUser(userId) {
        if (confirm("Are you sure you want to delete this user?")) {
            fetch(`https://ehs-deploy.vercel.app/api/delete-user/${userId}`, {
                method: "DELETE",
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        alert("User deleted successfully!");
                        fetchUsers(searchInput.value);  // Refresh the users list
                    } else {
                        alert("Failed to delete user.");
                    }
                })
                .catch(error => {
                    console.error("Error deleting user:", error);
                    alert("Error deleting user");
                });
        }
    }

    // Update Pagination Controls
    function updatePaginationControls(totalUsers) {
        const totalPages = Math.ceil(totalUsers / usersPerPage);
        pageNumber.textContent = `Page ${currentPage} of ${totalPages}`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalUsers === 0;
    }

    // Pagination Button Listeners
    prevBtn.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            fetchUsers(searchInput.value);
        }
    });

    nextBtn.addEventListener("click", function () {
        const totalPages = Math.ceil(allUsers.length / usersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            fetchUsers(searchInput.value);
        }
    });

    // Search Input Listener
    searchInput.addEventListener("input", function (e) {
        currentPage = 1;
        fetchUsers(e.target.value);
    });

    // Initial fetch
    fetchUsers();
});