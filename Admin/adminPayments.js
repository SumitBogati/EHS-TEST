document.addEventListener('DOMContentLoaded', async () => {
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    const noDataRow = document.getElementById('noDataRow');
    const paginationControls = document.getElementById('paymentPaginationControls');
    const pageNumberDisplay = document.getElementById('paymentPageNumber');
    const prevBtn = document.getElementById('paymentPrevBtn');
    const nextBtn = document.getElementById('paymentNextBtn');
    const searchInput = document.getElementById('paymentSearchInput');
    const statusFilter = document.getElementById('paymentStatusFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const totalEarningsDisplay = document.getElementById('totalEarnings');
    const token = localStorage.getItem("token");
    const logoutLink = document.getElementById("logout-link");
    const editPaymentOverlay = document.getElementById('editPaymentOverlay');
    const editPaymentForm = document.getElementById('editPaymentForm');
    const editPaymentCancelBtn = document.getElementById('editPaymentCancelBtn');

    let currentPaymentPage = 1;
    const paymentsPerPage = 6;
    let allPayments = [];
    let filteredPayments = [];

    // Function to parse Weekday, Month Day format to Date object
    function parseDateFromSelectedFormat(dateStr) {
        if (!dateStr) return null;
        // Example: "Fri, Apr 25" -> Date object
        const parts = dateStr.split(', ');
        if (parts.length !== 2) return null;
        const [month, day] = parts[1].split(' ');
        const year = new Date().getFullYear(); // Assume current year for simplicity
        const date = new Date(`${month} ${day}, ${year}`);
        return isNaN(date.getTime()) ? null : date;
    }

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

    await fetchPayments();

    async function fetchPayments() {
        try {
            const response = await fetch('https://ehs-deploy.vercel.app/api/payments');
            if (!response.ok) throw new Error('Failed to fetch payments');
            allPayments = await response.json();
            currentPaymentPage = 1;
            applyFilters();
        } catch (error) {
            console.error('Error fetching payments:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch payments.',
                confirmButtonText: 'OK'
            });
        }
    }

    function applyFilters() {
        const searchText = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;
        const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
        const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;

        filteredPayments = allPayments.filter(payment => {
            const matchesSearch = !searchText || (
                (payment.userName && payment.userName.toLowerCase().includes(searchText)) ||
                (payment.serviceName && payment.serviceName.toLowerCase().includes(searchText))
            );
            const matchesStatus = !selectedStatus || payment.status === selectedStatus;
            const paymentDate = parseDateFromSelectedFormat(payment.date);
            const matchesDate = (!startDate || !paymentDate || paymentDate >= startDate) &&
                                (!endDate || !paymentDate || paymentDate <= new Date(endDate.setHours(23, 59, 59, 999)));

            return matchesSearch && matchesStatus && matchesDate;
        });

        updateTotalEarnings();
        currentPaymentPage = 1;
        displayPayments();
    }

    function updateTotalEarnings() {
        const total = filteredPayments
            .filter(payment => payment.status === 'completed')
            .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        totalEarningsDisplay.textContent = total.toFixed();
    }

    function displayPayments() {
        const startIndex = (currentPaymentPage - 1) * paymentsPerPage;
        const endIndex = startIndex + paymentsPerPage;
        const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
        paymentsTableBody.innerHTML = '';
        if (paginatedPayments.length === 0) {
            noDataRow.style.display = 'block';
            paginationControls.style.display = 'none';
            return;
        }
        noDataRow.style.display = 'none';
        paginatedPayments.forEach((payment, index) => {
            const disabled = ['refunded', 'completed'].includes(payment.status) ? 'disabled' : '';
            const row = `
                <tr>
                    <td>${startIndex + index + 1}</td>
                    <td>${payment.userName || 'N/A'}</td>
                    <td>${payment.serviceName || 'N/A'}</td>
                    <td>${payment.date || 'N/A'}</td>
                    <td>${payment.amount}</td>
                    <td>
                        <select class="status-dropdown ${payment.status}" data-payment-id="${payment._id}" ${disabled}>
                            <option value="initiated" ${payment.status === 'initiated' ? 'selected' : ''}>Initiated</option>
                            <option value="completed" ${payment.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="partial" ${payment.status === 'partial' ? 'selected' : ''}>Partial</option>
                            <option value="refunded" ${payment.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                        </select>
                    </td>
                    <td>
                        <button class="edit-button" data-payment-id="${payment._id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button class="delete-button" data-payment-id="${payment._id}"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
            paymentsTableBody.insertAdjacentHTML('beforeend', row);
        });
        applyStatusColors();
        updatePaginationControls();
        paginationControls.style.display = 'block';
    }

    function applyStatusColors() {
        document.querySelectorAll('.status-dropdown').forEach(dropdown => {
            dropdown.classList.remove("initiated", "completed", "partial", "refunded");
            dropdown.classList.add(dropdown.value);
        });
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);
        pageNumberDisplay.textContent = `Page ${currentPaymentPage} of ${totalPages}`;
        prevBtn.disabled = currentPaymentPage === 1;
        nextBtn.disabled = currentPaymentPage === totalPages;
    }

    prevBtn.addEventListener('click', () => {
        if (currentPaymentPage > 1) {
            currentPaymentPage--;
            displayPayments();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);
        if (currentPaymentPage < totalPages) {
            currentPaymentPage++;
            displayPayments();
        }
    });

    paymentsTableBody.addEventListener('change', async (event) => {
        if (event.target.classList.contains('status-dropdown')) {
            const paymentId = event.target.dataset.paymentId;
            const newStatus = event.target.value;
            if (!paymentId) return;
            try {
                const response = await fetch(`https://ehs-deploy.vercel.app/api/payments/${paymentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update payment status');
                }
                event.target.classList.remove("initiated", "completed", "partial", "refunded");
                event.target.classList.add(newStatus);
                Swal.fire({
                    icon: 'success',
                    title: 'Status Updated',
                    text: 'Payment status updated successfully.',
                    confirmButtonText: 'OK'
                });
                await fetchPayments();
            } catch (error) {
                console.error('Error updating payment status:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to update payment status.',
                    confirmButtonText: 'OK'
                });
            }
        }
    });

    paymentsTableBody.addEventListener('click', async (event) => {
        if (event.target.closest('.delete-button')) {
            const paymentId = event.target.closest('.delete-button').dataset.paymentId;
            if (!paymentId) return;
            const confirmed = await Swal.fire({
                title: 'Are you sure?',
                text: "You want to delete this payment?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            });
            if (!confirmed.isConfirmed) return;
            try {
                const response = await fetch(`https://ehs-deploy.vercel.app/api/payments/${paymentId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete payment');
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Payment has been deleted.',
                    confirmButtonText: 'OK'
                });
                await fetchPayments();
            } catch (error) {
                console.error('Error deleting payment:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'Failed to delete payment.',
                    confirmButtonText: 'OK'
                });
            }
        }

        if (event.target.closest('.edit-button')) {
            const paymentId = event.target.closest('.edit-button').dataset.paymentId;
            const payment = allPayments.find(p => p._id === paymentId);
            if (!payment) return;
            document.getElementById('edit-payment-id').value = payment._id;
            document.getElementById('edit-payment-user').value = payment.userName || 'N/A';
            document.getElementById('edit-payment-service').value = payment.serviceName || 'N/A';
            document.getElementById('edit-payment-date').value = payment.date || 'N/A';
            document.getElementById('edit-payment-amount').value = payment.amount || '';
            document.getElementById('edit-payment-status').value = payment.status || '';
            editPaymentOverlay.style.display = 'flex';
        }
    });

    editPaymentCancelBtn.addEventListener('click', () => {
        editPaymentOverlay.style.display = 'none';
        editPaymentForm.reset();
    });

    editPaymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const paymentId = document.getElementById('edit-payment-id').value;
        const newStatus = document.getElementById('edit-payment-status').value;
        if (!paymentId || !newStatus) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Input',
                text: 'Please select a status.',
                confirmButtonText: 'OK'
            });
            return;
        }
        try {
            const response = await fetch(`https://ehs-deploy.vercel.app/api/payments/${paymentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update payment status');
            }
            Swal.fire({
                icon: 'success',
                title: 'Payment Updated',
                text: 'Payment status has been updated successfully.',
                confirmButtonText: 'OK'
            }).then(() => {
                editPaymentOverlay.style.display = 'none';
                editPaymentForm.reset();
                fetchPayments();
            });
        } catch (error) {
            console.error('Error updating payment status:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update payment status.',
                confirmButtonText: 'OK'
            });
        }
    });

    searchInput.addEventListener('input', () => applyFilters());
    statusFilter.addEventListener('change', () => applyFilters());
    startDateFilter.addEventListener('change', () => applyFilters());
    endDateFilter.addEventListener('change', () => applyFilters());
});