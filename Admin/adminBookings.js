document.addEventListener('DOMContentLoaded', async () => {
    const bookingsTableBody = document.getElementById('bookingsTableBody');
    const noDataRow = document.getElementById('noDataRow');
    const paginationControls = document.getElementById('bookingPaginationControls');
    const pageNumberDisplay = document.getElementById('bookingPageNumber');
    const prevBtn = document.getElementById('bookingPrevBtn');
    const nextBtn = document.getElementById('bookingNextBtn');
    const statusFilterDropdown = document.getElementById('statusFilterDropdown');
    const searchInput = document.getElementById('searchInput');
    const editBookingOverlay = document.getElementById('editBookingOverlay');
    const editBookingForm = document.getElementById('editBookingForm');
    const editBookingCancelBtn = document.getElementById('editBookingCancelBtn');
    const editBookingDate = document.getElementById('edit-booking-date');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");

    let currentBookingPage = 1;
    const bookingsPerPage = 6;
    let allBookings = [];
    let filteredBookings = [];

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

    // Load bookings initially
    await fetchBookings();

    // Function to format a date for the dropdown and database (Weekday, Month, Date)
    function formatDateForSelected(date) {
        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }

    // Function to format a date for backend (YYYY-MM-DD)
    function formatDateForBackend(date) {
        return date.toISOString().split('T')[0];
    }

    // Function to parse Weekday, Month Day format to Date object
    function parseDateFromSelectedFormat(dateStr) {
        // Example: "Fri, Apr 25" -> Date object
        const parts = dateStr.split(', ');
        const [month, day] = parts[1].split(' ');
        const year = new Date().getFullYear(); // Assume current year for simplicity
        return new Date(`${month} ${day}, ${year}`);
    }

    // Function to convert Weekday, Month Day to YYYY-MM-DD
    function convertSelectedToBackendFormat(dateStr) {
        const date = parseDateFromSelectedFormat(dateStr);
        return formatDateForBackend(date);
    }

    // Generate date options for the dropdown (next 7 days)
    function generateDateOptions(selectedDate = null) {
        editBookingDate.innerHTML = '<option value="">Select Date</option>';
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const formattedDateForSelected = formatDateForSelected(date);
            const formattedDateForBackend = formatDateForBackend(date);
            const option = document.createElement('option');
            option.value = formattedDateForBackend;
            option.textContent = formattedDateForSelected;
            if (selectedDate === formattedDateForBackend) {
                option.selected = true;
            }
            editBookingDate.appendChild(option);
        }
    }

    // Fetch all bookings from server
    async function fetchBookings() {
        try {
            const response = await fetch('https://ehs-deploy-sooty.vercel.app/api/bookings');
            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            allBookings = await response.json();
            filteredBookings = allBookings;
            currentBookingPage = 1;
            displayBookings();

        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    }

    // Display bookings for the current page
    function displayBookings() {
        const startIndex = (currentBookingPage - 1) * bookingsPerPage;
        const endIndex = startIndex + bookingsPerPage;
        const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

        bookingsTableBody.innerHTML = '';

        if (paginatedBookings.length === 0) {
            noDataRow.style.display = 'block';
            paginationControls.style.display = 'none';
            return;
        }

        noDataRow.style.display = 'none';

        paginatedBookings.forEach((booking, index) => {
            const disabled = booking.status === 'cancelled' || booking.status === 'completed' ? 'disabled' : '';

            const row = `
                <tr>
                    <td>${startIndex + index + 1}</td>
                    <td>${booking.service ? booking.service.name : 'N/A'}</td>
                    <td>${booking.user.name}</td>
                    <td>${booking.date}</td>
                    <td>${booking.timeSlot}</td>
                    <td>
                        <select class="status-dropdown ${booking.status}" data-booking-id="${booking.id}" ${disabled}>
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="inprogress" ${booking.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td>${booking.staff.name}</td>
                    <td>${booking.price}</td>
                    <td>
                        <button class="edit-button" data-booking-id="${booking.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button class="delete-button" data-booking-id="${booking.id}"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;

            bookingsTableBody.insertAdjacentHTML('beforeend', row);
        });

        applyStatusColors();
        updatePaginationControls();
        paginationControls.style.display = 'block';
    }

    // Update status dropdown colors
    function applyStatusColors() {
        document.querySelectorAll('.status-dropdown').forEach(dropdown => {
            dropdown.classList.remove("pending", "inprogress", "cancelled", "completed");
            dropdown.classList.add(dropdown.value);
        });
    }

    // Update pagination controls
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
        pageNumberDisplay.textContent = `Page ${currentBookingPage} of ${totalPages}`;
        prevBtn.disabled = currentBookingPage === 1;
        nextBtn.disabled = currentBookingPage === totalPages;
    }

    // Event listener for edit and delete buttons
    bookingsTableBody.addEventListener('click', async (event) => {
        const bookingId = event.target.closest('button')?.dataset.bookingId;
        if (!bookingId) return;

        if (event.target.closest('.edit-button')) {
            const booking = allBookings.find(b => b.id === bookingId);
            if (booking) {
                // Convert booking.date (e.g., "Fri, Apr 25") to YYYY-MM-DD for dropdown
                const backendDate = convertSelectedToBackendFormat(booking.date);
                // Populate the edit form
                document.getElementById('edit-booking-id').value = booking.id;
                document.getElementById('edit-booking-service').value = booking.service?.name || 'N/A';
                document.getElementById('edit-booking-user').value = booking.user?.name || 'N/A';
                generateDateOptions(backendDate); // Populate date dropdown with pre-selected date
                document.getElementById('edit-booking-time').value = booking.timeSlot;
                document.getElementById('edit-booking-status').value = booking.status;
                document.getElementById('edit-booking-price').value = booking.price;

                // Show the overlay
                editBookingOverlay.style.display = 'flex';
                setTimeout(() => editBookingOverlay.classList.add('active'), 10); // Slight delay for display to take effect
            }
        } else if (event.target.closest('.delete-button')) {
            if (confirm('Are you sure you want to delete this booking?')) {
                try {
                    const response = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/${bookingId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        throw new Error('Failed to delete booking');
                    }
                    await fetchBookings();
                    alert('Booking deleted successfully');
                } catch (error) {
                    console.error('Error deleting booking:', error);
                    alert('Failed to delete booking');
                }
            }
        }
    });

    // Event listener for status update in table
    bookingsTableBody.addEventListener('change', async (event) => {
        if (event.target.classList.contains('status-dropdown')) {
            const bookingId = event.target.dataset.bookingId;
            const newStatus = event.target.value;

            try {
                const response = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update status');
                }

                event.target.classList.remove("pending", "inprogress", "cancelled", "completed");
                event.target.classList.add(newStatus);

                await fetchBookings();
                alert('Status updated successfully');

            } catch (error) {
                console.error('Error updating status:', error);
                alert('Failed to update status');
            }
        }
    });

    // Event listener for filter change
    statusFilterDropdown.addEventListener('change', (event) => {
        const selectedStatus = event.target.value;

        if (selectedStatus) {
            filteredBookings = allBookings.filter(booking => booking.status === selectedStatus);
        } else {
            filteredBookings = allBookings;
        }

        currentBookingPage = 1;
        displayBookings();
    });

    // Event listener for search input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        filteredBookings = allBookings.filter(booking => {
            return (
                booking.service.name.toLowerCase().includes(query) ||
                booking.user.name.toLowerCase().includes(query) ||
                booking.date.toLowerCase().includes(query) ||
                booking.timeSlot.toLowerCase().includes(query)
            );
        });

        currentBookingPage = 1;
        displayBookings();
    });

    // Pagination: Previous
    prevBtn.addEventListener('click', () => {
        if (currentBookingPage > 1) {
            currentBookingPage--;
            displayBookings();
        }
    });

    // Pagination: Next
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
        if (currentBookingPage < totalPages) {
            currentBookingPage++;
            displayBookings();
        }
    });

    // Handle form submission for rescheduling booking
    editBookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const bookingId = document.getElementById('edit-booking-id').value;
        const newDateBackend = document.getElementById('edit-booking-date').value;
        const newTimeSlot = document.getElementById('edit-booking-time').value;

        // Convert YYYY-MM-DD to Weekday, Month Day for backend
        const newDate = newDateBackend ? formatDateForSelected(new Date(newDateBackend)) : null;

        try {
            // Reschedule if date and time slot provided
            if (newDate && newTimeSlot) {
                const rescheduleResponse = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/${bookingId}/reschedule`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newDate, newTimeSlot }),
                });

                if (!rescheduleResponse.ok) {
                    const errorData = await rescheduleResponse.json();
                    throw new Error(errorData.error || 'Failed to reschedule booking');
                }
            } else {
                throw new Error('Date and time slot are required');
            }

            // Close overlay and refresh bookings
            editBookingOverlay.classList.remove('active');
            setTimeout(() => editBookingOverlay.style.display = 'none', 300);
            await fetchBookings();
            alert('Booking rescheduled successfully');

        } catch (error) {
            console.error('Error rescheduling booking:', error);
            alert(`Failed to reschedule booking: ${error.message}`);
        }
    });

    // Close overlay on cancel
    editBookingCancelBtn.addEventListener('click', () => {
        editBookingOverlay.classList.remove('active');
        setTimeout(() => editBookingOverlay.style.display = 'none', 300);
        editBookingForm.reset();
        generateDateOptions(); // Reset date dropdown
    });
});