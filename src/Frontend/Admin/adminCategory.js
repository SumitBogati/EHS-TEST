document.addEventListener("DOMContentLoaded", function () {
    const addCategoryBtn = document.querySelector(".add-category-button");
    const addCategoryOverlay = document.getElementById("addCategoryOverlay");
    const editCategoryOverlay = document.getElementById("editCategoryOverlay");
    const addCancelBtn = document.getElementById("addCancelBtn");
    const editCancelBtn = document.getElementById("editCancelBtn");
    const addCategoryForm = document.getElementById("addCategoryForm");
    const editCategoryForm = document.getElementById("editCategoryForm");
    const addCategoryNameInput = document.getElementById("add-category-name");
    const addCategoryImageInput = document.getElementById("add-category-image");
    const addCategoryImagePreview = document.getElementById("add-category-image-preview");
    const editCategoryNameInput = document.getElementById("edit-category-name");
    const editCategoryImageInput = document.getElementById("edit-category-image");
    const editCategoryImagePreview = document.getElementById("edit-category-image-preview");
    const searchInput = document.querySelector(".search-input");
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");
    
    let currentCategoryId = null;
    let existingImagePath = "";
    let currentPage = 1;
    const categoriesPerPage = 4;
    let isFetching = false;

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
                        window.location.href = "/src/Frontend/index.html";
                    });
                }
            });
        });
    }

    // Prevent live reload
    window.onbeforeunload = function (e) {
        const addOverlayVisible = addCategoryOverlay.classList.contains("active");
        const editOverlayVisible = editCategoryOverlay.classList.contains("active");
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
                        Authorization: `Bearer ${token}`, //Header Request for checking role
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
                if (error.message.includes("401")) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Session Expired',
                        text: 'Your session has expired. Please log in again.',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userId");
                        localStorage.removeItem("userRole");
                        window.location.href = "/src/Frontend/index.html";
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

    function validateImageType(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        return allowedTypes.includes(file.type);
    }

    // Open add overlay
    addCategoryBtn.addEventListener("click", function () {
        addCategoryOverlay.classList.add("active");
        addCategoryNameInput.value = "";
        addCategoryImageInput.value = "";
        addCategoryImagePreview.src = "";
        addCategoryImagePreview.style.display = "none";
    });

    // Open edit overlay
    function openEditOverlay(category) {
        currentCategoryId = category._id;
        existingImagePath = category.image;
        editCategoryNameInput.value = category.name;
        editCategoryImagePreview.src = `https://ehs-deploy-8yty.vercel.app/${category.image}`;
        editCategoryImagePreview.style.display = "block";
        editCategoryImageInput.value = "";
        editCategoryOverlay.classList.add("active");
    }

    // Close overlays
    addCancelBtn.addEventListener("click", function () {
        addCategoryOverlay.classList.remove("active");
    });

    editCancelBtn.addEventListener("click", function () {
        editCategoryOverlay.classList.remove("active");
    });

    window.addEventListener("click", function (event) {
        if (event.target === addCategoryOverlay) {
            addCategoryOverlay.classList.remove("active");
        }
        if (event.target === editCategoryOverlay) {
            editCategoryOverlay.classList.remove("active");
        }
    });

    // Debounced search
    const debouncedFetchCategories = debounce((searchQuery) => {
        fetchCategories(searchQuery);
    }, 300);

    searchInput.addEventListener("input", function () {
        const searchQuery = searchInput.value.trim().toLowerCase();
        debouncedFetchCategories(searchQuery);
    });

    // Image preview for add form
    addCategoryImageInput.addEventListener("change", function () {
        const file = addCategoryImageInput.files[0];
        
        if (file) {
            if (!validateImageType(file)) {
                alert("Only images in JPEG, JPG, or PNG formats are allowed");
                addCategoryImageInput.value = ""; // Clear the invalid file
                addCategoryImagePreview.style.display = "none";
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function (e) {
                addCategoryImagePreview.src = e.target.result;
                addCategoryImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            addCategoryImagePreview.style.display = "none";
        }
    });

    // Image preview for edit form
    editCategoryImageInput.addEventListener("change", function () {
        const file = editCategoryImageInput.files[0];
        
        if (file) {
            if (!validateImageType(file)) {
                alert("Only images in JPEG, JPG, or PNG formats are allowed");
                editCategoryImageInput.value = ""; // Clear the invalid file
                editCategoryImagePreview.src = `https://ehs-deploy-8yty.vercel.app/${existingImagePath}`;
                editCategoryImagePreview.style.display = existingImagePath ? "block" : "none";
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function (e) {
                editCategoryImagePreview.src = e.target.result;
                editCategoryImagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            editCategoryImagePreview.src = `https://ehs-deploy-8yty.vercel.app/${existingImagePath}`;
            editCategoryImagePreview.style.display = existingImagePath ? "block" : "none";
        }
    });

    // Add Category Form Submission
    addCategoryForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData();
        const categoryName = addCategoryNameInput.value;
        const categoryImage = addCategoryImageInput.files[0];

        if (categoryName) {
            formData.append("name", categoryName);
        }

        if (categoryImage) {
            formData.append("image", categoryImage);
        }

        fetchWithRetry("https://ehs-deploy-8yty.vercel.app/api/add-category", {
            method: "POST",
            body: formData,
        })
            .then(data => {
                alert(data.message || "Category added successfully");
                fetchCategories();
                addCategoryOverlay.classList.remove("active");
            })
            .catch(error => {
                alert(error.message || "Failed to add category");
            });
    });

    // Edit Category Form Submission
    editCategoryForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData();
        const categoryName = editCategoryNameInput.value;
        const categoryImage = editCategoryImageInput.files[0];

        if (categoryName) {
            formData.append("name", categoryName);
        }

        if (categoryImage) {
            formData.append("image", categoryImage);
        }

        fetchWithRetry(`https://ehs-deploy-8yty.vercel.app/api/update-category/${currentCategoryId}`, {
            method: "PUT",
            body: formData,
        })
            .then(data => {
                alert(data.message || "Category updated successfully");
                fetchCategories();
                editCategoryOverlay.classList.remove("active");
            })
            .catch(error => {
                alert(error.message || "Failed to update category");
            });
    });

    // Fetch categories
    async function fetchCategories(searchQuery = "") {
        if (isFetching) return;
        isFetching = true;

        try {
            const categories = await fetchWithRetry("https://ehs-deploy-8yty.vercel.app/api/categories", {
                method: "GET",
            });
            const tableBody = document.querySelector(".categories-table tbody");
            const noDataRow = document.getElementById("noDataRow");
            const paginationControls = document.getElementById("paginationControls");

            tableBody.innerHTML = "";

            const filteredCategories = categories.filter(category =>
                category.name.toLowerCase().includes(searchQuery)
            );

            if (filteredCategories.length === 0) {
                noDataRow.style.display = "block";
                paginationControls.style.display = "none";
            } else {
                noDataRow.style.display = "none";
                paginationControls.style.display = "block";

                const startIndex = (currentPage - 1) * categoriesPerPage;
                const endIndex = startIndex + categoriesPerPage;
                const categoriesToDisplay = filteredCategories.slice(startIndex, endIndex);

                categoriesToDisplay.forEach((category, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${startIndex + index + 1}</td>
                        <td>
                            <div class="category-name">
                                <img src="https://ehs-deploy-8yty.vercel.app/${category.image}" alt="${category.name}" class="category-image">
                                <span>${category.name}</span>
                            </div>
                        </td>
                        <td>${category.totalServices}</td>
                        <td>
                            <div class="actions-container">
                                <button class="edit-button" data-id="${category._id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                                <button class="delete-button" data-id="${category._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                updatePaginationControls(filteredCategories.length);

                // Attach event listeners
                document.querySelectorAll(".edit-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const categoryId = button.getAttribute("data-id");
                        fetchWithRetry(`https://ehs-deploy-8yty.vercel.app/api/category/${categoryId}`, {
                            method: "GET",
                        })
                            .then(category => {
                                openEditOverlay(category);
                            })
                            .catch(error => {
                                alert(error.message || "Failed to load category data");
                            });
                    });
                });

                document.querySelectorAll(".delete-button").forEach(button => {
                    button.addEventListener("click", function () {
                        const categoryId = button.getAttribute("data-id");
                        if (confirm("Are you sure you want to delete this category?")) {
                            fetchWithRetry(`https://ehs-deploy-8yty.vercel.app/api/delete-category/${categoryId}`, {
                                method: "DELETE",
                            })
                                .then(data => {
                                    alert(data.message || "Category deleted successfully");
                                    fetchCategories();
                                })
                                .catch(error => {
                                    alert(error.message || "Failed to delete category");
                                });
                        }
                    });
                });
            }
        } catch (error) {
            alert(error.message || "Error fetching categories");
        } finally {
            isFetching = false;
        }
    }

    // Update pagination controls
    function updatePaginationControls(totalCategories) {
        const totalPages = Math.ceil(totalCategories / categoriesPerPage);
        document.getElementById("pageNumber").textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById("prevBtn").disabled = currentPage === 1;
        document.getElementById("nextBtn").disabled = currentPage === totalPages;
    }

    // Pagination controls
    document.getElementById("prevBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            fetchCategories(searchInput.value.trim().toLowerCase());
        }
    });

    document.getElementById("nextBtn").addEventListener("click", function () {
        currentPage++;
        fetchCategories(searchInput.value.trim().toLowerCase());
    });

    // Initial fetch
    fetchCategories();
});