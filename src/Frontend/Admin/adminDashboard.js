document.addEventListener('DOMContentLoaded', async function () {

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

    // Select the "See all" buttons
    const seeAllPaymentButton = document.querySelector('.see-all-btn-transaction');
    const seeAllServiceButton = document.querySelector('.see-all-btn');

    try {
        // Fetch the dashboard stats
        const response = await fetch('https://ehs-deploy.vercel.app/api/dashboard/total');
        const data = await response.json();

        if (response.ok) {
            // Update the HTML elements with the fetched data
            document.querySelector('.stats-box.users h4').textContent = data.totalUsers;
            document.querySelector('.stats-box.staff h4').textContent = data.totalStaff;
            document.querySelector('.stats-box.bookings h4').textContent = data.totalBookings;
            document.querySelector('.stats-box.revenue h4').textContent = `Rs. ${data.totalPaymentAmount}`;

            // Display the latest transactions
            const transactionsTableBody = document.querySelector('.recent-transactions tbody');
            const noTransactionsDiv = document.querySelector('.no-transactions');
            transactionsTableBody.innerHTML = '';

            if (data.latestTransactions.length === 0) {
                // No transactions available
                noTransactionsDiv.style.display = 'block';
                seeAllPaymentButton.style.display = 'none';
            } else {
                // Transactions available
                noTransactionsDiv.style.display = 'none';
                seeAllPaymentButton.style.display = 'block';

                // Limit the transactions to the latest 4 and display the newest first
                const latestTransactions = data.latestTransactions.slice(0, 4);
                const currentYear = new Date().getFullYear();

                latestTransactions.forEach(transaction => {
                    // Append the current year to the transaction date if not already included
                    let dateString = transaction.date;
                    if (!dateString.match(/, \d{4}$/)) {
                        dateString = `${dateString}, ${currentYear}`;
                    }
                    const transactionDate = new Date(dateString);
                    const formattedDate = transactionDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                    });

                    const statusClass = transaction.status === 'completed' ? 'completed' : 'unpaid';

                    const transactionRow = document.createElement('tr');
                    transactionRow.innerHTML = `
                        <td>${transaction.user.firstName} ${transaction.user.lastName}</td>
                        <td>${formattedDate}</td>
                        <td>Rs. ${transaction.amount}</td>
                        <td><span class="status ${statusClass}">${transaction.status}</span></td>
                    `;
                    transactionsTableBody.appendChild(transactionRow);
                });
            }

            // Fetch the top booked services
            const topServicesResponse = await fetch('https://ehs-deploy.vercel.app/api/services/top-booked');
            const topServicesData = await topServicesResponse.json();

            if (topServicesResponse.ok) {
                const topServicesList = document.querySelector('#top-services-list');
                const noServicesDiv = document.querySelector('.no-services');
                topServicesList.innerHTML = '';

                if (topServicesData.length === 0) {
                    // No top booked services available
                    noServicesDiv.style.display = 'block';
                    seeAllServiceButton.style.display = 'none';
                } else {
                    // Top booked services available
                    noServicesDiv.style.display = 'none';
                    seeAllServiceButton.style.display = 'block';

                    topServicesData.forEach(service => {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                            <img src="https://ehs-deploy.vercel.app/${service.image}" alt="${service.name}">
                            <span>${service.name}</span>
                            <span class="service-count">${service.count}</span>
                        `;
                        topServicesList.appendChild(listItem);
                    });
                }
            } else {
                console.error('Failed to fetch top booked services:', topServicesData.error);
                // Handle error case for top services
                const topServicesList = document.querySelector('#top-services-list');
                const noServicesDiv = document.querySelector('.no-services');
                topServicesList.innerHTML = '';
                noServicesDiv.style.display = 'block';
                seeAllServiceButton.style.display = 'none';
            }
        } else {
            console.error('Failed to fetch dashboard stats:', data.error);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Handle general error case
        const transactionsTableBody = document.querySelector('.recent-transactions tbody');
        const noTransactionsDiv = document.querySelector('.no-transactions');
        const topServicesList = document.querySelector('#top-services-list');
        const noServicesDiv = document.querySelector('.no-services');

        transactionsTableBody.innerHTML = '';
        noTransactionsDiv.style.display = 'block';
        seeAllPaymentButton.style.display = 'none';

        topServicesList.innerHTML = '';
        noServicesDiv.style.display = 'block';
        seeAllServiceButton.style.display = 'none';
    }

    // Add event listeners for "See all" buttons
    if (seeAllPaymentButton) {
        seeAllPaymentButton.addEventListener('click', function() {
            window.location.href = '/src/Frontend/Admin/adminPayments.html';
        });
    }

    if (seeAllServiceButton) {
        seeAllServiceButton.addEventListener('click', function() {
            window.location.href = '/src/Frontend/Admin/adminService.html';
        });
    }
});