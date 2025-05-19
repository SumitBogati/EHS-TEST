document.addEventListener("DOMContentLoaded", function () {
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
            window.location.href = "index.html";
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
                        window.location.href = "index.html";
                    });
                }
            });
        });
    }

    // Get the current date and format it
    const currentDateElement = document.getElementById("current-date");
    const optionsForCurrentDate = { weekday: "short", month: "short", day: "numeric" };
    const currentDate = new Date().toLocaleDateString("en-US", optionsForCurrentDate);
    currentDateElement.textContent = `Today: ${currentDate}`;

    // Function to format a date for the grid (Month and Date only)
    function formatDateForGrid(date) {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    // Function to format a date for the selected date section (Day, Month, Date)
    function formatDateForSelected(date) {
        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }

    // Function to create date buttons dynamically for the week (Sun-Sat)
    function generateDateButtons() {
        const dateGrid = document.getElementById("date-grid");
        const today = new Date();

        dateGrid.innerHTML = ""; // Clear previous buttons

        for (let i = 0; i < 7; i++) {
            const dayOfWeek = new Date(today);
            dayOfWeek.setDate(today.getDate() + i);
            const formattedDateForGrid = formatDateForGrid(dayOfWeek);
            const formattedDateForSelected = formatDateForSelected(dayOfWeek);
            const button = document.createElement("button");
            button.classList.add("date-btn");
            button.textContent = formattedDateForGrid;

            button.addEventListener("click", function () {
                currentDateElement.textContent = `Selected: ${formattedDateForSelected}`;
                document.querySelectorAll(".date-btn").forEach((b) => b.classList.remove("selected"));
                button.classList.add("selected");

                if (new Date().toLocaleDateString() === dayOfWeek.toLocaleDateString()) {
                    disablePastTimeSlots();
                    // Clear selected time slot if it's disabled
                    const selectedTimeSlot = document.querySelector(".time-slot.selected");
                    if (selectedTimeSlot && selectedTimeSlot.classList.contains("disabled")) {
                        selectedTimeSlot.classList.remove("selected");
                    }
                } else {
                    enableAllTimeSlots();
                }
            });

            dateGrid.appendChild(button);
        }
    }

    function disablePastTimeSlots() {
        const currentDate = new Date();
        const currentHour = currentDate.getHours();
        const currentMinutes = currentDate.getMinutes();

        timeSlots.forEach((slot) => {
            const slotTimeText = slot.textContent;
            const slotStartHour = timeSlotsMapping[slotTimeText];
            const currentTimeInHours = currentHour + currentMinutes / 60;

            if (slotStartHour <= currentTimeInHours + 2) {
                slot.classList.add("disabled");
                slot.style.pointerEvents = "none";
            }
        });
    }

    function enableAllTimeSlots() {
        timeSlots.forEach((slot) => {
            slot.classList.remove("disabled");
            slot.style.pointerEvents = "auto";
        });
    }

    // Fetch service details and display
    async function fetchServiceDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get("id");

        if (!serviceId) {
            console.error("Service ID is missing from the URL.");
            return;
        }

        try {
            const response = await fetch(`https://ehs-deploy.vercel.app/api/service/${serviceId}`);
            if (!response.ok) throw new Error("Failed to fetch service details.");

            const service = await response.json();
            displayServiceDetails(service);
            fetchStaffByCategory(service.category); // Fetch staff based on service category
        } catch (error) {
            console.error("Error fetching service details:", error);
            alert("Failed to load service details.");
        }
    }

    // Display service details
    function displayServiceDetails(service) {
        document.querySelector(".service-name").textContent = service.name;
        document.querySelector(".service-category").textContent = service.category;
        document.querySelector(".service-description").textContent = service.description;
        document.querySelector(".service-image").src = `https://ehs-deploy.vercel.app/${service.image}`;
        const servicePriceElement = document.querySelector(".service-price");
        servicePriceElement.textContent = `Rs. ${service.price}`;
        servicePriceElement.setAttribute("data-price", service.price);
    }

    // Fetch staff based on service category
    async function fetchStaffByCategory(category) {
        try {
            const response = await fetch("https://ehs-deploy.vercel.app/api/staff");
            if (!response.ok) throw new Error("Failed to fetch staff details.");

            const staffList = await response.json();
            const filteredStaff = staffList.filter(staff => staff.category === category);
            populateStaffDropdown(filteredStaff);
        } catch (error) {
            console.error("Error fetching staff:", error);
            alert("Failed to load staff details.");
        }
    }

    // Populate staff dropdown
    function populateStaffDropdown(staffList) {
        const staffDropdown = document.querySelector("#staff-dropdown");
        staffDropdown.innerHTML = ""; // Clear previous options

        if (staffList.length === 0) {
            const option = document.createElement("option");
            option.textContent = "No staff available";
            staffDropdown.appendChild(option);
            return;
        }

        staffList.forEach(staff => {
            const option = document.createElement("option");
            option.value = staff._id;
            option.textContent = staff.name;
            staffDropdown.appendChild(option);
        });
    }

    // Time slots mapping
    const timeSlots = document.querySelectorAll(".time-slot");
    const timeSlotsMapping = {
        "8AM - 9AM": 8, "9AM - 10AM": 9, "10AM - 11AM": 10, "11AM - 12PM": 11,
        "12PM - 1PM": 12, "1PM - 2PM": 13, "2PM - 3PM": 14, "3PM - 4PM": 15, "4PM - 5PM": 16
    };

    // Event listener for time slot selection
    timeSlots.forEach((slot) => {
        slot.addEventListener("click", function () {
            if (!this.classList.contains("disabled")) {
                timeSlots.forEach((s) => s.classList.remove("selected"));
                this.classList.add("selected");
            }
        });
    });

    // Payment modal and booking process
    const paymentModal = document.getElementById("payment-modal");
    const closeModal = paymentModal.querySelector(".close-btn");
    const confirmPayment = paymentModal.querySelector(".confirm-payment");

    // Book Now button event listener with validation for selected date, time, and staff
    document.querySelector(".book-button").addEventListener("click", () => {
        const selectedDate = currentDateElement.textContent.replace("Selected: ", "").trim();
        const selectedTimeSlot = document.querySelector(".time-slot.selected");
        const selectedStaff = document.querySelector("#staff-dropdown").value;

        if (selectedDate && selectedTimeSlot && selectedStaff) {
            // Check if the selected time slot is disabled
            if (selectedTimeSlot.classList.contains("disabled")) {
                Swal.fire({
                    icon: "warning",
                    title: "Invalid Time Slot",
                    text: "The selected time slot is in the past. Please choose a valid time slot.",
                });
                return;
            }
            paymentModal.style.display = "flex";
        } else {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Selection",
                text: "Please select a date, time slot, and staff before proceeding with the booking.",
            });
        }
    });

    // Close payment modal
    closeModal.addEventListener("click", () => paymentModal.style.display = "none");

    window.addEventListener("click", (event) => {
        if (event.target === paymentModal) {
            paymentModal.style.display = "none";
        }
    });

    // Confirm payment
    confirmPayment.addEventListener("click", async () => {
        const selectedDateText = currentDateElement.textContent.replace("Selected: ", "").trim();
        const selectedTimeSlot = document.querySelector(".time-slot.selected");
        const selectedStaff = document.querySelector("#staff-dropdown").value;
        const serviceId = new URLSearchParams(window.location.search).get("id");
        const servicePrice = document.querySelector(".service-price").getAttribute("data-price");

        // Validate time slot is not disabled
        if (selectedTimeSlot.classList.contains("disabled")) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Time Slot",
                text: "The selected time slot is in the past. Please choose a valid time slot.",
            }).then(() => {
                paymentModal.style.display = "none"; // Close modal
            });
            return;
        }

        const bookingData = {
            serviceId,
            userId: localStorage.getItem("userId"),
            date: selectedDateText,
            timeSlot: selectedTimeSlot.textContent,
            staffId: selectedStaff,
            price: servicePrice
        };

        try {
            const response = await fetch("https://ehs-deploy.vercel.app/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            const result = await response.json();

            if (response.ok) {
                if (result.payment_url) {
                    // Redirect to Khalti Payment Page
                    window.location.href = result.payment_url;
                } else {
                    // Handle case where payment is already processed (unlikely in your flow)
                    Swal.fire({
                        icon: "success",
                        title: "Booking Initiated",
                        text: "Your booking has been initiated successfully.",
                    }).then(() => {
                        paymentModal.style.display = "none"; // Close modal
                    });
                }
            } else {
                // Show backend error message and close modal
                Swal.fire({
                    icon: "error",
                    title: "Booking Failed",
                    text: result.error || "An error occurred while processing your booking.",
                }).then(() => {
                    paymentModal.style.display = "none"; // Close modal to allow user to adjust selections
                });
            }
        } catch (err) {
            // Show network error and close modal
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to initiate booking and payment. Please try again later.",
            }).then(() => {
                paymentModal.style.display = "none"; // Close modal to allow user to adjust selections
            });
        }
    });

    // Ensure payment status is checked when page is loaded
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const serviceName = urlParams.get("serviceName");
    const timeSlot = urlParams.get("timeSlot");
    const date = urlParams.get("date");

    if (paymentStatus === "success" && serviceName && timeSlot && date) {
        setTimeout(() => {
            Swal.fire({
                icon: "success",
                title: "Payment Successful!",
                html: 
                    `<p><strong>Service:</strong> ${decodeURIComponent(serviceName)}</p>
                    <p><strong>Date:</strong> ${decodeURIComponent(date)}</p>
                    <p><strong>Time Slot:</strong> ${decodeURIComponent(timeSlot)}</p>
                    <p>Your booking has been confirmed.</p>`,
                confirmButtonText: "OK"
            }).then(() => {
                // Redirect to userBooking.html after clicking OK
                window.location.href = "userBookings.html";
            });
        }, 500);
    } else if (paymentStatus === "failed") {
        setTimeout(() => {
            Swal.fire({
                icon: "error",
                title: "Payment Failed!",
                text: "Something went wrong. Please try again.",
                confirmButtonText: "OK"
            }).then(() => {
                // Redirect to userBooking.html even on failure
                window.location.href = "userBookings.html";
            });
        }, 500);
    }

    // Ensure back button doesn't redirect to the payment page again
    window.history.pushState({}, document.title, window.location.pathname + `?id=${urlParams.get("id")}`);

    generateDateButtons();
    disablePastTimeSlots();
    fetchServiceDetails();
});