// Function to fetch user bookings from the backend and render them
async function fetchUserBookings() {
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
    
    const userId = localStorage.getItem('userId'); // Get user ID from local storage
    try {
        // Fetch bookings from the backend using the user's ID
        const response = await fetch(`http://localhost:3000/api/bookings/${userId}`);
        const bookings = await response.json();

        const bookingsList = document.querySelector(".bookings-list");
        bookingsList.innerHTML = '';

        // If the response is successful and there are bookings, sort and display them
        if (response.status === 200 && bookings.length > 0) {
            // Sort bookings by priority
            bookings.sort((a, b) => {
                const statusPriority = {
                    'pending': 1,
                    'inprogress': 2,
                    'completed': 3,
                    'cancelled': 4
                };

                // First, compare the statuses (higher priority first)
                const statusComparison = statusPriority[a.status] - statusPriority[b.status];
                if (statusComparison !== 0) {
                    return statusComparison; // Sort by status priority
                }
            });

            // After sorting, display the bookings
            displayBookings(bookings);
        } else {
            console.log('No bookings found');
            displayNoBookingsImage();
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        displayNoBookingsImage();
    }
}

// Function to fetch the user's first name from the backend
async function fetchUserDetails(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`);
        const user = await response.json();
        return user.firstName;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

// Function to display a no bookings message and image
function displayNoBookingsImage() {
    const bookingsList = document.querySelector(".bookings-list");
    bookingsList.innerHTML = ''; // Clear previous content

    // Create and display a 'No Bookings' message with an image
    const noBookingDiv = document.createElement("div");
    noBookingDiv.classList.add("no-bookings");

    const noBookingImage = document.createElement("img");
    noBookingImage.src = "/Image/404-error.svg";
    noBookingImage.alt = "No Bookings Available";
    noBookingImage.classList.add("no-bookings-image");

    const message = document.createElement("p");
    message.textContent = "No bookings found";
    message.classList.add("no-bookings-message");

    noBookingDiv.appendChild(noBookingImage);
    noBookingDiv.appendChild(message);

    bookingsList.appendChild(noBookingDiv);
}

// Function to render the bookings onto the page
function displayBookings(bookings) {
    const bookingsList = document.querySelector(".bookings-list");
    bookingsList.innerHTML = '';

    // Loop through sorted bookings and render each booking
    bookings.forEach(booking => {
        const bookingCard = document.createElement("div");
        bookingCard.classList.add("booking-card");
        bookingCard.setAttribute('data-id', booking.id); 
        const imageUrl = `http://localhost:3000/${booking.service.image}`;
        const serviceImage = document.createElement("img");
        serviceImage.src = imageUrl;
        serviceImage.alt = "Service Image";
        serviceImage.classList.add("booking-image");

        // Create and append booking information
        const bookingInfo = document.createElement("div");
        bookingInfo.classList.add("booking-info");

        const bookingName = document.createElement("h3");
        bookingName.classList.add("booking-name");
        bookingName.textContent = booking.service.name;

        const bookingDate = document.createElement("p");
        bookingDate.classList.add("booking-date");
        bookingDate.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Date: ${booking.date}`;

        const bookingTime = document.createElement("p");
        bookingTime.classList.add("booking-time");
        bookingTime.innerHTML = `<i class="fa-solid fa-clock"></i> Time: ${booking.timeSlot}`;

        // Payment information
        const paymentStatus = document.createElement("p");
        paymentStatus.classList.add("payment-status");
        paymentStatus.innerHTML = `<i class="fa-solid fa-credit-card"></i> Payment Status: ${booking.paymentStatus.toUpperCase()}`;

        const paymentAmount = document.createElement("p");
        paymentAmount.classList.add("payment-amount");
        paymentAmount.innerHTML = `<i class="fa-solid fa-money-bill"></i> Amount: Rs ${(booking.payment.amount)}`;

        // Booking status with icon
        const bookingStatus = document.createElement("p");
        bookingStatus.classList.add("booking-status");

        const statusIcon = getBookingStatusIcon(booking.status);
        bookingStatus.innerHTML = statusIcon;

        bookingStatus.classList.add(booking.status);

        // Create a Cancel button for pending bookings only
        const cancelButton = document.createElement("button");
        cancelButton.classList.add("cancel-button");
        cancelButton.textContent = "Cancel Booking";

        // Show Cancel button only if the booking status is 'pending'
        if (booking.status !== 'pending') {
            cancelButton.style.display = 'none';
        }

        // Event listener for the cancel button
        cancelButton.addEventListener('click', async (e) => {
            e.stopPropagation(); 

            // Use SweetAlert to confirm cancellation
            const result = await Swal.fire({
                title: 'Are you sure you want to cancel this booking?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Cancel it!',
                cancelButtonText: 'No, Keep it'
            });

            if (result.isConfirmed) {
                try {
                    // Send PUT request to update the booking status to 'cancelled'
                    const response = await fetch(`http://localhost:3000/api/bookings/${booking.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled' }), // Sending the status change in the body
                    });

                    const data = await response.json(); 
                    if (response.ok) {
                        showCancellationPopup();

                        booking.status = 'cancelled';
                        fetchUserBookings();
                    } else {
                        Swal.fire('Error', 'There was an error cancelling your booking.', 'error');
                    }
                } catch (error) {
                    console.error('Error cancelling booking:', error);
                    Swal.fire('Error', 'Error cancelling booking. Please try again later.', 'error');
                }
            }
        });

        bookingInfo.appendChild(bookingName);
        bookingInfo.appendChild(bookingDate);
        bookingInfo.appendChild(bookingTime);
        bookingInfo.appendChild(paymentStatus);
        bookingInfo.appendChild(paymentAmount);
        bookingInfo.appendChild(bookingStatus);
        bookingInfo.appendChild(cancelButton);
        bookingCard.appendChild(serviceImage);
        bookingCard.appendChild(bookingInfo);

        bookingCard.addEventListener('click', function () {
            openOverlay(booking);
        });

        bookingsList.appendChild(bookingCard);
    });
}

// Function to show a custom popup message after booking cancellation
async function showCancellationPopup() {
    const userId = localStorage.getItem('userId');
    const firstName = await fetchUserDetails(userId);

    // Create a new overlay container
    const overlay = document.createElement('div');
    overlay.classList.add('popup-overlay');

    // Create the popup content
    const popup = document.createElement('div');
    popup.classList.add('popup');

    const icon = document.createElement('i');
    icon.classList.add('fa', 'fa-check-circle', 'icon');
    popup.appendChild(icon);

    // Create the heading for the popup
    const heading = document.createElement('h2');
    heading.textContent = "Booking Cancelled Successfully";
    popup.appendChild(heading);

    // Create the personalized message
    const message = document.createElement('p');
    message.textContent = `Dear ${firstName || 'User'}, since your payment is made and the booking is cancelled, the booking amount will be returned within 2-3 business days. If there is any delay, please contact us.`;
    popup.appendChild(message);

    //close button
    const closeButton = document.createElement('button');
    closeButton.classList.add('close-btn');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });

    popup.appendChild(closeButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    const okButton = document.createElement('button');
    okButton.textContent = 'Okay, Got it';
    okButton.addEventListener('click', () => {
        overlay.remove();
    });

    buttonContainer.appendChild(okButton);
    popup.appendChild(buttonContainer);

    // Append the popup to the overlay
    overlay.appendChild(popup);

    // Append the overlay to the body
    document.body.appendChild(overlay);
}

// Function to get the booking status icon and text based on status
function getBookingStatusIcon(status) {
    let statusText = '';
    let icon = '';

    switch (status) {
        case 'confirmed':
            statusText = 'Confirmed';
            icon = 'fa-check-circle';
            break;
        case 'pending':
            statusText = 'Pending';
            icon = 'fa-exclamation-circle';
            break;
        case 'cancelled':
            statusText = 'Cancelled';
            icon = 'fa-xmark';
            break;
        case 'inprogress':
            statusText = 'In Progress';
            icon = 'fa-spinner';
            break;
        case 'completed':
            statusText = 'Completed';
            icon = 'fa-check';
            break;
        default:
            statusText = 'Unknown';
            icon = 'fa-question-circle';
            break;
    }

    return `Booking Status: ${statusText}<i class="fa ${icon}"></i> `; // Return the status and associated icon
}

// Updated: openOverlay function with more booking and staff details
function openOverlay(booking) {
    // Show overlay
    document.getElementById('overlay').style.display = 'flex';

    // Set staff image
    document.getElementById('overlayStaffImage').src = `http://localhost:3000/${booking.staff.image}`;

    // Set staff details
    document.getElementById('overlayStaffName').textContent = `Staff Name: ${booking.staff.name}`;
    document.getElementById('overlayStaffPhone').textContent = `Staff Phone: ${booking.staff.phone}`;

    // Set service details
    document.getElementById('overlayBookingName').textContent = `Service Name: ${booking.service.name}`;
    document.getElementById('overlayBookingDate').textContent = `Date: ${booking.date}`;
    document.getElementById('overlayBookingTime').textContent = `Time: ${booking.timeSlot}`;
}

// Close overlay function
function closeOverlay() {
    document.getElementById('overlay').style.display = 'none'; // Hide the overlay
}

// Fetch and display the user's bookings once the page is loaded
fetchUserBookings();