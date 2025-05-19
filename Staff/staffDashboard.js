document.addEventListener('DOMContentLoaded', async () => {
    // DOM element references for the bookings table and controls
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
    const staffNameDisplay = document.getElementById('staffName');

    // Pagination and booking data variables
    let currentBookingPage = 1;
    const bookingsPerPage = 6;
    let allBookings = [];
    let filteredBookings = [];

    // Retrieve staff details from localStorage
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");

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

    // Set default staff name display
    staffNameDisplay.textContent = 'Staff';

    // Initial fetch of staff-specific bookings
    await fetchBookings();

    // Format date for dropdown display (e.g., "Fri, Apr 25")
    function formatDateForSelected(date) {
        return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }

    // Format date for backend (e.g., "2025-04-25")
    function formatDateForBackend(date) {
        return date.toISOString().split('T')[0];
    }

    // Parse dropdown date format (e.g., "Fri, Apr 25") to Date object
    function parseDateFromSelectedFormat(dateStr) {
        const parts = dateStr.split(', ');
        const [month, day] = parts[1].split(' ');
        const year = new Date().getFullYear(); // Assume current year
        return new Date(`${month} ${day}, ${year}`);
    }

    // Convert dropdown date format to backend format (e.g., "Fri, Apr 25" to "2025-04-25")
    function convertSelectedToBackendFormat(dateStr) {
        const date = parseDateFromSelectedFormat(dateStr);
        return formatDateForBackend(date);
    }

    // Generate date options for edit form dropdown (next 7 days)
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

    // Fetch staff-specific bookings from the server
    async function fetchBookings() {
        try {
            const response = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/staff/${userId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch bookings: ${response.status}`);
            }

            allBookings = await response.json();
            filteredBookings = allBookings;
            currentBookingPage = 1;
            displayBookings();

        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Failed to fetch bookings. Please try again later.');
        }
    }

    // Display bookings for the current page
    function displayBookings() {
        const startIndex = (currentBookingPage - 1) * bookingsPerPage;
        const endIndex = startIndex + bookingsPerPage;
        const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

        bookingsTableBody.innerHTML = '';

        // Show "No Data" row if no bookings are available
        if (paginatedBookings.length === 0) {
            noDataRow.style.display = 'block';
            paginationControls.style.display = 'none';
            return;
        }

        noDataRow.style.display = 'none';

        // Populate table with paginated bookings
        paginatedBookings.forEach((booking, index) => {
            const disabled = booking.status === 'cancelled' || booking.status === 'completed' ? 'disabled' : '';
            const row = `
                <tr>
                    <td>${startIndex + index + 1}</td>
                    <td>${booking.service?.name || 'N/A'}</td>
                    <td>${booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A'}</td>
                    <td>${booking.date}</td>
                    <td>${booking.timeSlot}</td>
                    <td>${booking.user.address}</td>
                    <td>
                        <select class="status-dropdown ${booking.status}" data-booking-id="${booking.id}" ${disabled}>
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="inprogress" ${booking.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td>${booking.price}</td>
                    <td>
                        <button class="edit-button" data-booking-id="${booking.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    </td>
                </tr>
            `;

            bookingsTableBody.insertAdjacentHTML('beforeend', row);
        });

        applyStatusColors();
        updatePaginationControls();
        paginationControls.style.display = 'block';
    }

    // Apply CSS classes to status dropdowns based on their value
    function applyStatusColors() {
        document.querySelectorAll('.status-dropdown').forEach(dropdown => {
            dropdown.classList.remove("pending", "inprogress", "cancelled", "completed");
            dropdown.classList.add(dropdown.value);
        });
    }

    // Update pagination controls based on current page and total bookings
    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
        pageNumberDisplay.textContent = `Page ${currentBookingPage} of ${totalPages}`;
        prevBtn.disabled = currentBookingPage === 1;
        nextBtn.disabled = currentBookingPage === totalPages;
    }

    // Handle edit button clicks to open the edit form
    bookingsTableBody.addEventListener('click', async (event) => {
        const bookingId = event.target.closest('button')?.dataset.bookingId;
        if (!bookingId || !event.target.closest('.edit-button')) return;

        const booking = allBookings.find(b => b.id === bookingId);
        if (booking) {
            // Convert booking date to backend format for dropdown
            const backendDate = convertSelectedToBackendFormat(booking.date);
            // Populate edit form fields
            document.getElementById('edit-booking-id').value = booking.id;
            document.getElementById('edit-booking-service').value = booking.service?.name || 'N/A';
            document.getElementById('edit-booking-user').value = booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A';
            generateDateOptions(backendDate);
            document.getElementById('edit-booking-time').value = booking.timeSlot;
            document.getElementById('edit-booking-status').value = booking.status;
            document.getElementById('edit-booking-price').value = booking.price;

            // Show edit overlay
            editBookingOverlay.style.display = 'flex';
            setTimeout(() => editBookingOverlay.classList.add('active'), 10);
        }
    });

    // Handle status changes in the table dropdown
    bookingsTableBody.addEventListener('change', async (event) => {
        if (event.target.classList.contains('status-dropdown')) {
            const bookingId = event.target.dataset.bookingId;
            const newStatus = event.target.value;

            try {
                const response = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    throw new Error('Failed to update status');
                }

                // Update dropdown styling
                event.target.classList.remove("pending", "inprogress", "cancelled", "completed");
                event.target.classList.add(newStatus);

                // Refresh bookings to reflect changes
                await fetchBookings();
                alert('Status updated successfully');

            } catch (error) {
                console.error('Error updating status:', error);
                alert('Failed to update status. Please try again.');
            }
        }
    });

    // Filter bookings by status
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

    // Search bookings based on input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        filteredBookings = allBookings.filter(booking => {
            return (
                (booking.service?.name || '').toLowerCase().includes(query) ||
                (booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : '').toLowerCase().includes(query) ||
                booking.date.toLowerCase().includes(query) ||
                booking.timeSlot.toLowerCase().includes(query)
            );
        });

        currentBookingPage = 1;
        displayBookings();
    });

    // Navigate to previous page
    prevBtn.addEventListener('click', () => {
        if (currentBookingPage > 1) {
            currentBookingPage--;
            displayBookings();
        }
    });

    // Navigate to next page
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
        if (currentBookingPage < totalPages) {
            currentBookingPage++;
            displayBookings();
        }
    });

    // Handle edit form submission for rescheduling
    editBookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const bookingId = document.getElementById('edit-booking-id').value;
        const newDateBackend = document.getElementById('edit-booking-date').value;
        const newTimeSlot = document.getElementById('edit-booking-time').value;

        // Convert date to backend display format
        const newDate = newDateBackend ? formatDateForSelected(new Date(newDateBackend)) : null;

        try {
            // Reschedule booking if date and time slot are provided
            if (newDate && newTimeSlot) {
                const rescheduleResponse = await fetch(`https://ehs-deploy-sooty.vercel.app/api/bookings/${bookingId}/reschedule`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newDate, newTimeSlot })
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

    // Close edit overlay on cancel
    editBookingCancelBtn.addEventListener('click', () => {
        editBookingOverlay.classList.remove('active');
        setTimeout(() => editBookingOverlay.style.display = 'none', 300);
        editBookingForm.reset();
        generateDateOptions();
    });
});