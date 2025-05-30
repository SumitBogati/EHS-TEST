document.addEventListener("DOMContentLoaded", function () {
    const addStaffBtn = document.getElementById("addStaffBtn");
    const addStaffOverlay = document.getElementById("addStaffOverlay");
    const editStaffOverlay = document.getElementById("editStaffOverlay");
    const addCancelBtn = document.getElementById("addCancelBtn");
    const editCancelBtn = document.getElementById("editCancelBtn");
    const addStaffForm = document.getElementById("addStaffForm");
    const editStaffForm = document.getElementById("editStaffForm");
    const addStaffNameInput = document.getElementById("add-staff-name");
    const addPhoneNumberInput = document.getElementById("add-phone-number");
    const addAddressInput = document.getElementById("add-address");
    const addCategoryDropdown = document.getElementById("add-category");
    const addStaffImageInput = document.getElementById("add-staff-image");
    const addStaffImagePreview = document.getElementById("add-staff-image-preview");
    const editStaffNameInput = document.getElementById("edit-staff-name");
    const editPhoneNumberInput = document.getElementById("edit-phone-number");
    const editAddressInput = document.getElementById("edit-address");
    const editCategoryDropdown = document.getElementById("edit-category");
    const editStaffImageInput = document.getElementById("edit-staff-image");
    const editStaffImagePreview = document.getElementById("edit-staff-image-preview");
    const searchInput = document.querySelector(".search-input");
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    const logoutLink = document.getElementById("logout-link");

    let currentStaffId = null;
    let existingImagePath = "";
    let currentPage = 1;
    const staffPerPage = 4;
    let isFetching = false;

    // Redirect if no token or not an admin
    if (!token || userRole !== "admin") {
        Swal.fire({
            icon: 'warning',
            title: 'Unauthorized Access',
            text: 'Please login as an admin to continue.',
            confirmButtonText: 'OK'
        }).then(() => {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("userRole");
            window.location.href = "/index.html";
        });
        return;
    }

    // Logout logic with SweetAlert confirmation
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

    // Prevent live reload
    window.onbeforeunload = function (e) {
        const addOverlayVisible = addStaffOverlay.classList.contains("active");
        const editOverlayVisible = editStaffOverlay.classList.contains("active");
        if (addOverlayVisible || editOverlayVisible) {
            e.preventDefault();
            e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
            return "You have unsaved changes. Are you sure you want to leave?";
        }
    };

    // Custom alert with SweetAlert
    function showAlert(message, options = {}) {
        const { onConfirm, isError = false, isConfirm = false } = options;
        Swal.fire({
            icon: isError ? 'error' : isConfirm ? 'warning' : 'success',
            title: isError ? 'Error' : isConfirm ? 'Confirm' : 'Success',
            text: message,
            showCancelButton: isConfirm,
            confirmButtonText: isConfirm ? 'Yes' : 'OK',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed && onConfirm) {
                onConfirm();
            }
        });
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Fetch with timeout and retry
    async function fetchWithRetry(url, options, retries = 3, timeout = 5000) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });
                clearTimeout(id);
                const data = await response.json();
                console.log(`Response from ${url}:`, data);

                if (!response.ok) {
                    const errorMessage = data.error || data.message || `Server error: ${response.status}`;
                    throw new Error(errorMessage);
                }
                return data;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed for ${url}:`, error);
                if (error.message.includes("401") || error.message.includes("403")) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Session Expired or Unauthorized',
                        text: 'Your session has expired or you lack admin privileges. Please log in again.',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userId");
                        localStorage.removeItem("userRole");
                        window.location.href = "/index.html";
                    });
                    throw error;
                }
                if (error.message.includes("Failed to fetch") && i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                throw error;
            }
        }
    }

    // Validate image type
    function validateImageType(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        return allowedTypes.includes(file.type);
    }

    // Populate category dropdowns
    async function fetchCategories() {
        try {
            const categories = await fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/categories", {
                method: "GET",
            });
            [addCategoryDropdown, editCategoryDropdown].forEach(dropdown => {
                dropdown.innerHTML = '<option value="" disabled selected>Select Category</option>';
                categories.forEach(category => {
                    const option = document.createElement("option");
                    option.value = category.name;
                    option.textContent = category.name;
                    dropdown.appendChild(option);
                });
            });
        } catch (error) {
            showAlert(error.message || "Failed to load categories", { isError: true });
        }
    }

    // Open add overlay
    addStaffBtn.addEventListener("click", function () {
        addStaffOverlay.classList.add("active");
        addStaffForm.reset();
        addStaffImagePreview.src = "";
        addStaffImagePreview.style.display = "none";
    });

    // Open edit overlay
    function openEditOverlay(staff) {
        currentStaffId = staff._id;
        existingImagePath = staff.image || "";
        editStaffNameInput.value = staff.name;
        editPhoneNumberInput.value = staff.phone;
        editAddressInput.value = staff.address;
        editCategoryDropdown.value = staff.category;
        editStaffImagePreview.src = staff.image || "";
        editStaffImagePreview.style.display = staff.image ? "block" : "none";
        editStaffImageInput.value = "";
        editStaffOverlay.classList.add("active");
    }

    // Close overlays
    addCancelBtn.addEventListener("click", function () {
        addStaffOverlay.classList.remove("active");
    });

    editCancelBtn.addEventListener("click", function () {
        editStaffOverlay.classList.remove("active");
    });

    window.addEventListener("click", function (event) {
        if (event.target === addStaffOverlay) {
            addStaffOverlay.classList.remove("active");
        }
        if (event.target === editStaffOverlay) {
            editStaffOverlay.classList.remove("active");
        }
    });

    // Debounced search
    const debouncedFetchStaff = debounce((searchQuery) => {
        fetchStaff(searchQuery);
    }, 300);

    searchInput.addEventListener("input", function () {
        const searchQuery = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        debouncedFetchStaff(searchQuery);
    });

    // Image preview for add form
    addStaffImageInput.addEventListener("change", function () {
        const file = addStaffImageInput.files[0];
        if (file) {
            if (!validateImageType(file)) {
                showAlert("Only JPEG, JPG, or PNG images are allowed", { isError: true });
                addStaffImageInput.value = "";
                addStaffImagePreview.src = "";
                addStaffImagePreview.style.display = "none";
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                addStaffImagePreview.src = e.target.result;
                addStaffImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            addStaffImagePreview.src = "";
            addStaffImagePreview.style.display = "none";
        }
    });

    // Image preview for edit form
    editStaffImageInput.addEventListener("change", function () {
        const file = editStaffImageInput.files[0];
        if (file) {
            if (!validateImageType(file)) {
                showAlert("Only JPEG, JPG, or PNG images are allowed", { isError: true });
                editStaffImageInput.value = "";
                editStaffImagePreview.src = existingImagePath || "";
                editStaffImagePreview.style.display = existingImagePath ? "block" : "none";
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                editStaffImagePreview.src = e.target.result;
                editStaffImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            editStaffImagePreview.src = existingImagePath || "";
            editStaffImagePreview.style.display = existingImagePath ? "block" : "none";
        }
    });

    // Add Staff Form Submission
    addStaffForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData();
        const staffName = addStaffNameInput.value;
        const phoneNumber = addPhoneNumberInput.value;
        const address = addAddressInput.value;
        const categoryName = addCategoryDropdown.value;
        const staffImage = addStaffImageInput.files[0];

        if (!staffName || !phoneNumber || !address || !categoryName || !staffImage) {
            showAlert("All fields, including image, are required", { isError: true });
            return;
        }

        formData.append("name", staffName);
        formData.append("phone", phoneNumber);
        formData.append("address", address);
        formData.append("categoryName", categoryName);
        formData.append("image", staffImage);

        try {
            const data = await fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/add-staff", {
                method: "POST",
                body: formData,
            });
            showAlert(data.message || "Staff added successfully", {
                onConfirm: () => {
                    fetchStaff();
                    addStaffOverlay.classList.remove("active");
                }
            });
        } catch (error) {
            showAlert(error.message || "Failed to add staff", { isError: true });
        }
    });

    // Edit Staff Form Submission
    editStaffForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData();
        const staffName = editStaffNameInput.value;
        const phoneNumber = editPhoneNumberInput.value;
        const address = editAddressInput.value;
        const categoryName = editCategoryDropdown.value;
        const staffImage = editStaffImageInput.files[0];

        if (!staffName || !phoneNumber || !address || !categoryName) {
            showAlert("All required fields must be filled", { isError: true });
            return;
        }

        formData.append("name", staffName);
        formData.append("phone", phoneNumber);
        formData.append("address", address);
        formData.append("categoryName", categoryName);
        if (staffImage) {
            formData.append("image", staffImage);
        }

        try {
            const data = await fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/update-staff/${currentStaffId}`, {
                method: "PUT",
                body: formData,
            });
            showAlert(data.message || "Staff updated successfully", {
                onConfirm: () => {
                    fetchStaff();
                    editStaffOverlay.classList.remove("active");
                }
            });
        } catch (error) {
            showAlert(error.message || "Failed to update staff", { isError: true });
        }
    });

    // Fetch staff
    async function fetchStaff(searchQuery = "") {
        if (isFetching) return;
        isFetching = true;

        try {
            const staff = await fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/staff", {
                method: "GET",
            });
            const tableBody = document.querySelector(".staff-table tbody");
            const noDataRow = document.getElementById("noDataRow");
            const paginationControls = document.getElementById("paginationControls");

            tableBody.innerHTML = "";

            const filteredStaff = staff.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.phone.toLowerCase().includes(searchQuery) ||
                s.category.toLowerCase().includes(searchQuery)
            );

            if (filteredStaff.length === 0) {
                noDataRow.style.display = "block";
                paginationControls.style.display = "none";
            } else {
                noDataRow.style.display = "none";
                paginationControls.style.display = "block";

                const startIndex = (currentPage - 1) * staffPerPage;
                const endIndex = startIndex + staffPerPage;
                const staffToDisplay = filteredStaff.slice(startIndex, endIndex);

                staffToDisplay.forEach((s, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <div class="staff-name">
                                ${s.image ? `<img src="${s.image}" alt="${s.name}" class="staff-image">` : ''}
                                <span>${s.name}</span>
                            </div>
                        </td>
                        <td>${s.phone || 'N/A'}</td>
                        <td>${s.category}</td>
                        <td>${s.address || 'N/A'}</td>
                        <td>
                            <div class="actions-container">
                                <button class="edit-button" data-id="${s._id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                                <button class="delete-button" data-id="${s._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                updatePaginationControls(filteredStaff.length);

                // Attach event listeners
                document.querySelectorAll(".edit-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const staffId = button.getAttribute("data-id");
                        fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/staff/${staffId}`, {
                            method: "GET",
                        })
                            .then(staff => {
                                openEditOverlay(staff);
                            })
                            .catch(error => {
                                showAlert(error.message || "Failed to load staff data", { isError: true });
                            });
                    });
                });

                document.querySelectorAll(".delete-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const staffId = button.getAttribute("data-id");
                        showAlert("Are you sure you want to delete this staff?", {
                            isConfirm: true,
                            onConfirm: () => {
                                fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/delete-staff/${staffId}`, {
                                    method: "DELETE",
                                })
                                    .then(data => {
                                        showAlert(data.message || "Staff deleted successfully", {
                                            onConfirm: () => {
                                                if (filteredStaff.length - 1 <= (currentPage - 1) * staffPerPage) {
                                                    currentPage = Math.max(1, currentPage - 1);
                                                }
                                                fetchStaff(searchQuery);
                                            }
                                        });
                                    })
                                    .catch(error => {
                                        showAlert(error.message || "Failed to delete staff", { isError: true });
                                    });
                            }
                        });
                    });
                });
            }
        } catch (error) {
            showAlert(error.message || "Error fetching staff", { isError: true });
        } finally {
            isFetching = false;
        }
    }

    // Reset Password Button
    document.getElementById("resetPasswordBtn").addEventListener("click", function () {
        if (!currentStaffId) {
            showAlert("No staff selected for password reset", { isError: true });
            return;
        }

        showAlert("Are you sure you want to reset this staff's password?", {
            isConfirm: true,
            onConfirm: () => {
                fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/reset-staff-password/${currentStaffId}`, {
                    method: "POST",
                })
                    .then(data => {
                        showAlert(data.message || "Password reset successfully");
                    })
                    .catch(error => {
                        showAlert(error.message || "Failed to reset password", { isError: true });
                    });
            }
        });
    });

    // Update pagination controls
    function updatePaginationControls(totalStaff) {
        const totalPages = Math.ceil(totalStaff / staffPerPage);
        document.getElementById("pageNumber").textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById("prevBtn").disabled = currentPage === 1;
        document.getElementById("nextBtn").disabled = currentPage === totalPages;
    }

    // Pagination controls
    document.getElementById("prevBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            fetchStaff(searchInput.value.trim().toLowerCase());
        }
    });

    document.getElementById("nextBtn").addEventListener("click", function () {
        currentPage++;
        fetchStaff(searchInput.value.trim().toLowerCase());
    });

    // Initial fetch
    fetchCategories();
    fetchStaff();
});