document.addEventListener("DOMContentLoaded", function () {
    const filterCategories = document.getElementById("filter-categories");
    const servicesContainer = document.getElementById("services-container");
    const noDataMessage = document.getElementById("noDataMessage");
    const searchInput = document.getElementById("search-input");
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

    let allServices = [];

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

    // Fetch categories from the backend
    function fetchCategories() {
        fetch("https://ehs-deploy.vercel.app/api/categories")
            .then(response => response.json())
            .then(categories => {
                populateFilterOptions(categories);
            })
            .catch(error => {
                console.error("Error fetching categories:", error);
                filterCategories.innerHTML = `<li>Error loading categories</li>`;
            });
    }

    function populateFilterOptions(categories) {
        filterCategories.innerHTML = "";

        const allOption = document.createElement("li");
        allOption.innerHTML = `
            <a href="#" class="filter-item active" data-category="all">All Categories</a>
        `;
        filterCategories.appendChild(allOption);

        categories.forEach(category => {
            const option = document.createElement("li");
            option.innerHTML = `
                <a href="#" class="filter-item" data-category="${category.name}">${category.name}</a>
            `;
            filterCategories.appendChild(option);
        });

        attachFilterEvents();
    }

    function attachFilterEvents() {
        const filterItems = document.querySelectorAll(".filter-item");

        filterItems.forEach(item => {
            item.addEventListener("click", function (e) {
                e.preventDefault();
                filterItems.forEach(item => item.classList.remove("active"));
                this.classList.add("active");

                const selectedCategory = this.getAttribute("data-category");
                filterServicesByCategory(selectedCategory);
            });
        });
    }

    function fetchServices() {
        fetch("https://ehs-deploy.vercel.app/api/services")
            .then(response => response.json())
            .then(data => {
                allServices = data;
                renderServices(data);
            })
            .catch(error => {
                console.error("Error fetching services:", error);
                servicesContainer.innerHTML = `<p>Error loading services. Please try again later.</p>`;
            });
    }

    function truncateWords(text, wordLimit) {
        const words = text.split(" ");
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(" ") + " ....";
        }
        return text;
    }
    

    function renderServices(services) {
        servicesContainer.innerHTML = "";

        if (services.length === 0) {
            noDataMessage.style.display = "block";
            return;
        }

        noDataMessage.style.display = "none";

        services.forEach(service => {
            const imageUrl = `https://ehs-deploy.vercel.app/${service.image}`;
            const serviceCard = document.createElement("div");
            serviceCard.classList.add("service-card");
            serviceCard.dataset.category = service.category;

            serviceCard.innerHTML = `
                <img src="${imageUrl}" alt="${service.name}" class="service-image">
                <div class="service-info">
                    <h3 class="service-name">${service.name}</h3>
                    <p class="service-category">${service.category}</p>
                    <p class="service-price">Rs. ${service.price}</p>
                    <p class="service-description">${truncateWords(service.description, 9)}</p>
                    <button class="book-now-btn">Book Now</button>
                </div>
            `;

            serviceCard.querySelector(".book-now-btn").addEventListener("click", function () {
                window.location.href = `serviceDetail.html?id=${service._id}`;
            });

            servicesContainer.appendChild(serviceCard);
        });
    }

    function filterServicesByCategory(selectedCategory) {
        const filtered = selectedCategory === "all"
            ? allServices
            : allServices.filter(service => service.category === selectedCategory);

        renderServices(filtered);
    }

    function filterServicesBySearch(query) {
        const filtered = allServices.filter(service =>
            service.name.toLowerCase().includes(query.toLowerCase())
        );

        renderServices(filtered);
    }

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query !== "") {
            filterServicesBySearch(query);
        } else {
            renderServices(allServices);
        }
    });

    fetchCategories();
    fetchServices();
});