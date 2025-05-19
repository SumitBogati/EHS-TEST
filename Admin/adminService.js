document.addEventListener("DOMContentLoaded", function () {
    const addServiceBtn = document.querySelector(".add-service-button");
    const addServiceOverlay = document.getElementById("addServiceOverlay");
    const editServiceOverlay = document.getElementById("editServiceOverlay");
    const addCancelBtn = document.getElementById("addCancelBtn");
    const editCancelBtn = document.getElementById("editCancelBtn");
    const addServiceForm = document.getElementById("addServiceForm");
    const editServiceForm = document.getElementById("editServiceForm");
    const addServiceNameInput = document.getElementById("add-service-name");
    const addCategoryDropdown = document.getElementById("add-category-dropdown");
    const addPriceInput = document.getElementById("add-price");
    const addDescriptionInput = document.getElementById("add-description");
    const addServiceImageInput = document.getElementById("add-service-image");
    const addServiceImagePreview = document.getElementById("add-service-image-preview");
    const editServiceNameInput = document.getElementById("edit-service-name");
    const editCategoryDropdown = document.getElementById("edit-category-dropdown");
    const editPriceInput = document.getElementById("edit-price");
    const editDescriptionInput = document.getElementById("edit-description");
    const editServiceImageInput = document.getElementById("edit-service-image");
    const editServiceImagePreview = document.getElementById("edit-service-image-preview");
    const searchInput = document.querySelector(".search-input");
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    const logoutLink = document.getElementById("logout-link");

    let currentServiceId = null;
    let existingImagePath = "";
    let currentPage = 1;
    const servicesPerPage = 4;
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
        const addOverlayVisible = addServiceOverlay.classList.contains("active");
        const editOverlayVisible = editServiceOverlay.classList.contains("active");
        if (addOverlayVisible || editOverlayVisible) {
            e.preventDefault();
            e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
            return "You have unsaved changes. Are you sure you want to leave?";
        }
    };

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
                        Authorization: `Bearer ${token}`, // Ensure Authorization header is included
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

    // Open add overlay
    addServiceBtn.addEventListener("click", function () {
        addServiceOverlay.classList.add("active");
        addServiceNameInput.value = "";
        addCategoryDropdown.value = "";
        addPriceInput.value = "";
        addDescriptionInput.value = "";
        addServiceImageInput.value = "";
        addServiceImagePreview.src = "";
        addServiceImagePreview.style.display = "none";
    });

    // Open edit overlay
    function openEditOverlay(service) {
        currentServiceId = service._id;
        existingImagePath = service.image;
        editServiceNameInput.value = service.name;
        editCategoryDropdown.value = service.category;
        editPriceInput.value = service.price;
        editDescriptionInput.value = service.description;
        editServiceImagePreview.src = service.image;
        editServiceImagePreview.style.display = "block";
        editServiceImageInput.value = "";
        editServiceOverlay.classList.add("active");
    }

    // Close overlays
    addCancelBtn.addEventListener("click", function () {
        addServiceOverlay.classList.remove("active");
    });

    editCancelBtn.addEventListener("click", function () {
        editServiceOverlay.classList.remove("active");
    });

    window.addEventListener("click", function (event) {
        if (event.target === addServiceOverlay) {
            addServiceOverlay.classList.remove("active");
        }
        if (event.target === editServiceOverlay) {
            editServiceOverlay.classList.remove("active");
        }
    });

    // Debounced search
    const debouncedFetchServices = debounce((searchQuery) => {
        fetchServices(searchQuery);
    }, 300);

    searchInput.addEventListener("input", function () {
        const searchQuery = searchInput.value.trim().toLowerCase();
        debouncedFetchServices(searchQuery);
    });

    // Image preview for add form
    addServiceImageInput.addEventListener("change", function () {
        const file = addServiceImageInput.files[0];
        
        if (file) {
            if (!validateImageType(file)) {
                alert("Only images in JPEG, JPG, or PNG formats are allowed");
                addServiceImageInput.value = "";
                addServiceImagePreview.style.display = "none";
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function (e) {
                addServiceImagePreview.src = e.target.result;
                addServiceImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            addServiceImagePreview.style.display = "none";
        }
    });

    // Image preview for edit form
    editServiceImageInput.addEventListener("change", function () {
        const file = editServiceImageInput.files[0];
        
        if (file) {
            if (!validateImageType(file)) {
                alert("Only images in JPEG, JPG, or PNG formats are allowed");
                editServiceImageInput.value = "";
                editServiceImagePreview.src = service.image;
                editServiceImagePreview.style.display = existingImagePath ? "block" : "none";
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function (e) {
                editServiceImagePreview.src = e.target.result;
                editServiceImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            editServiceImagePreview.src = existingImagePath;
            editServiceImagePreview.style.display = existingImagePath ? "block" : "none";
        }
    });

    // Add Service Form Submission
    addServiceForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData();
        const serviceName = addServiceNameInput.value;
        const category = addCategoryDropdown.value;
        const price = addPriceInput.value;
        const description = addDescriptionInput.value;
        const serviceImage = addServiceImageInput.files[0];

        if (serviceName) {
            formData.append("name", serviceName);
        }
        if (category) {
            formData.append("category", category);
        }
        if (price) {
            formData.append("price", price);
        }
        if (description) {
            formData.append("description", description);
        }
        if (serviceImage) {
            formData.append("image", serviceImage);
        }

        fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/add-service", {
            method: "POST",
            body: formData,
        })
            .then(data => {
                alert(data.message || "Service added successfully");
                fetchServices();
                addServiceOverlay.classList.remove("active");
            })
            .catch(error => {
                alert(error.message || "Failed to add service");
            });
    });

    // Edit Service Form Submission
    editServiceForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData();
        const serviceName = editServiceNameInput.value;
        const category = editCategoryDropdown.value;
        const price = editPriceInput.value;
        const description = editDescriptionInput.value;
        const serviceImage = editServiceImageInput.files[0];

        if (serviceName) {
            formData.append("name", serviceName);
        }
        if (category) {
            formData.append("category", category);
        }
        if (price) {
            formData.append("price", price);
        }
        if (description) {
            formData.append("description", description);
        }
        if (serviceImage) {
            formData.append("image", serviceImage);
        }

        fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/update-service/${currentServiceId}`, {
            method: "PUT",
            body: formData,
        })
            .then(data => {
                alert(data.message || "Service updated successfully");
                fetchServices();
                editServiceOverlay.classList.remove("active");
            })
            .catch(error => {
                alert(error.message || "Failed to update service");
            });
    });

    // Fetch categories for dropdowns
    async function fetchCategories() {
        try {
            const categories = await fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/categories", {
                method: "GET",
            });
            [addCategoryDropdown, editCategoryDropdown].forEach(dropdown => {
                dropdown.innerHTML = '<option value="" disabled selected>Select a category</option>';
                categories.forEach(category => {
                    const option = document.createElement("option");
                    option.value = category.name;
                    option.textContent = category.name;
                    dropdown.appendChild(option);
                });
            });
        } catch (error) {
            alert(error.message || "Failed to load categories");
        }
    }

    // Fetch services
    async function fetchServices(searchQuery = "") {
        if (isFetching) return;
        isFetching = true;

        try {
            const services = await fetchWithRetry("https://ehs-deploy-sooty.vercel.app/api/services", {
                method: "GET",
            });
            const tableBody = document.querySelector(".service-table tbody");
            const noDataRow = document.getElementById("noDataRow");
            const paginationControls = document.getElementById("paginationControls");

            tableBody.innerHTML = "";

            const filteredServices = services.filter(service =>
                service.name.toLowerCase().includes(searchQuery) ||
                service.category.toLowerCase().includes(searchQuery) ||
                service.description.toLowerCase().includes(searchQuery)
            );

            if (filteredServices.length === 0) {
                noDataRow.style.display = "block";
                paginationControls.style.display = "none";
            } else {
                noDataRow.style.display = "none";
                paginationControls.style.display = "block";

                const startIndex = (currentPage - 1) * servicesPerPage;
                const endIndex = startIndex + servicesPerPage;
                const servicesToDisplay = filteredServices.slice(startIndex, endIndex);

                servicesToDisplay.forEach((service, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <div class="service-name">
                                <img src="${service.image}" alt="${service.name}" class="service-image">
                                <span>${service.name}</span>
                            </div>
                        </td>
                        <td>${service.category}</td>
                        <td>${service.price}</td>
                        <td>
                            <div class="actions-container">
                                <button class="edit-button" data-id="${service._id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                                <button class="delete-button" data-id="${service._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                updatePaginationControls(filteredServices.length);

                // Attach event listeners
                document.querySelectorAll(".edit-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const serviceId = button.getAttribute("data-id");
                        fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/service/${serviceId}`, {
                            method: "GET",
                        })
                            .then(service => {
                                openEditOverlay(service);
                            })
                            .catch(error => {
                                alert(error.message || "Failed to load service data");
                            });
                    });
                });

                document.querySelectorAll(".delete-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const serviceId = button.getAttribute("data-id");
                        if (confirm("Are you sure you want to delete this service?")) {
                            fetchWithRetry(`https://ehs-deploy-sooty.vercel.app/api/delete-service/${serviceId}`, {
                                method: "DELETE",
                            })
                                .then(data => {
                                    alert(data.message || "Service deleted successfully");
                                    fetchServices();
                                })
                                .catch(error => {
                                    alert(error.message || "Failed to delete service");
                                });
                        }
                    });
                });
            }
        } catch (error) {
            alert(error.message || "Error fetching services");
        } finally {
            isFetching = false;
        }
    }

    // Update pagination controls
    function updatePaginationControls(totalServices) {
        const totalPages = Math.ceil(totalServices / servicesPerPage);
        document.getElementById("pageNumber").textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById("prevBtn").disabled = currentPage === 1;
        document.getElementById("nextBtn").disabled = currentPage === totalPages;
    }

    // Pagination controls
    document.getElementById("prevBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            fetchServices(searchInput.value.trim().toLowerCase());
        }
    });

    document.getElementById("nextBtn").addEventListener("click", function () {
        currentPage++;
        fetchServices(searchInput.value.trim().toLowerCase());
    });

    // Initial fetch
    fetchCategories();
    fetchServices();
});