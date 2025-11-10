// Admin Reports - JavaScript// Admin Reports JavaScript

(function() {// (sidebar toggle moved to /js/admin/adminHeader.js)
    'use strict';

    // Chart instances
    let salesChart = null;
    let authProvidersChart = null;
    let paymentMethodsChart = null;
    let customerTrendChart = null;
    let branchPerformanceChart = null;

    // Current period for sales chart
    let currentPeriod = '30days';

    // Color scheme matching admin theme
    const colors = {
        primary: '#8B6E4C',
        secondary: '#9A6E4C',
        success: '#10B981',
        info: '#3B82F6',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#8B5CF6'
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('📊 Reports initializing...');
        loadOverviewStats();
        loadSalesReport(currentPeriod);
        loadCustomerAnalytics();
        loadInventoryReport();
        loadBranchPerformance();
        attachEventListeners();
    }

    function attachEventListeners() {
        // Period filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', handlePeriodChange);
        });
    }

    function handlePeriodChange(e) {
        const period = e.target.dataset.period;
        if (!period) return;

        // Update active state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        currentPeriod = period;
        loadSalesReport(period);
    }

    // Load Overview Statistics
    async function loadOverviewStats() {
        try {
            const response = await fetch('/admin/api/reports/overview');
            const data = await response.json();

            if (data.success) {
                const stats = data.stats;
                
                document.getElementById('totalRevenue').textContent = 
                    `₱${stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                
                document.getElementById('totalOrders').textContent = 
                    stats.totalOrders.toLocaleString();
                
                document.getElementById('totalCustomers').textContent = 
                    stats.totalCustomers.toLocaleString();
                
                document.getElementById('totalProducts').textContent = 
                    stats.totalProducts.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }

    // Load Sales Report
    async function loadSalesReport(period) {
        try {
            const response = await fetch(`/admin/api/reports/sales?period=${period}`);
            const data = await response.json();

            if (data.success) {
                renderSalesChart(data.report.salesData);
                renderTopProductsTable(data.report.topProducts);
                renderPaymentMethodsChart(data.report.paymentMethods);
            }
        } catch (error) {
            console.error('Error loading sales report:', error);
        }
    }

    // Load Customer Analytics
    async function loadCustomerAnalytics() {
        try {
            const response = await fetch('/admin/api/reports/customers');
            const data = await response.json();

            if (data.success) {
                console.log('Customer Analytics Data:', data.analytics);
                renderAuthProvidersChart(data.analytics.authProviders);
                renderCustomerTrendChart(data.analytics.customerTrend);
            }
        } catch (error) {
            console.error('Error loading customer analytics:', error);
        }
    }

    // Load Inventory Report
    async function loadInventoryReport() {
        try {
            const response = await fetch('/admin/api/reports/inventory');
            const data = await response.json();

            if (data.success) {
                renderLowStockTable(data.report.lowStock);
            }
        } catch (error) {
            console.error('Error loading inventory report:', error);
        }
    }

    // Load Branch Performance
    async function loadBranchPerformance() {
        try {
            const response = await fetch('/admin/api/reports/branches');
            const data = await response.json();

            if (data.success) {
                renderBranchPerformanceChart(data.performance);
            }
        } catch (error) {
            console.error('Error loading branch performance:', error);
        }
    }

    // Render Sales Chart
    function renderSalesChart(salesData) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        const labels = salesData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const revenueData = salesData.map(item => parseFloat(item.revenue || 0));
        const ordersData = salesData.map(item => parseInt(item.orders || 0));

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue (₱)',
                        data: revenueData,
                        borderColor: colors.success,
                        backgroundColor: `${colors.success}20`,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders',
                        data: ordersData,
                        borderColor: colors.primary,
                        backgroundColor: `${colors.primary}20`,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += '₱' + context.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 });
                                } else {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Revenue (₱)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Orders'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });
    }

    // Render Auth Providers Chart (Doughnut)
    function renderAuthProvidersChart(authData) {
        const ctx = document.getElementById('authProvidersChart');
        if (!ctx) return;

        console.log('Auth Providers Data:', authData);

        if (!authData || authData.length === 0) {
            ctx.getContext('2d').fillText('No data available', 10, 50);
            return;
        }

        const providerNames = {
            'local': 'Email/Password',
            'google': 'Google',
            'facebook': 'Facebook',
            'apple': 'Apple'
        };

        const labels = authData.map(item => providerNames[item.provider] || item.provider);
        const data = authData.map(item => parseInt(item.count));

        const chartColors = [colors.primary, colors.info, colors.success, colors.warning, colors.purple];

        if (authProvidersChart) {
            authProvidersChart.destroy();
        }

        authProvidersChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} users (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Render Payment Methods Chart
    function renderPaymentMethodsChart(paymentData) {
        const ctx = document.getElementById('paymentMethodsChart');
        if (!ctx) return;

        const methodNames = {
            'paypal': 'PayPal',
            'gcash': 'GCash',
            'cash_on_pickup': 'Cash on Pickup',
            'card': 'Credit/Debit Card'
        };

        const labels = paymentData.map(item => methodNames[item.payment_method] || item.payment_method);
        const data = paymentData.map(item => parseInt(item.count));

        const chartColors = [colors.info, colors.success, colors.primary, colors.purple];

        if (paymentMethodsChart) {
            paymentMethodsChart.destroy();
        }

        paymentMethodsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Render Customer Trend Chart
    function renderCustomerTrendChart(trendData) {
        const ctx = document.getElementById('customerTrendChart');
        if (!ctx) return;

        console.log('Customer Trend Data:', trendData);

        if (!trendData || trendData.length === 0) {
            // Show empty state
            if (customerTrendChart) {
                customerTrendChart.destroy();
            }
            customerTrendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'New Customers',
                        data: [0],
                        backgroundColor: colors.info,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            return;
        }

        const labels = trendData.map(item => {
            const [year, month] = item.month.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        const data = trendData.map(item => parseInt(item.new_customers));

        if (customerTrendChart) {
            customerTrendChart.destroy();
        }

        customerTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Customers',
                    data: data,
                    backgroundColor: colors.info,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Render Branch Performance Chart
    function renderBranchPerformanceChart(branchData) {
        const ctx = document.getElementById('branchPerformanceChart');
        if (!ctx) return;

        const labels = branchData.map(item => item.name);
        const revenueData = branchData.map(item => parseFloat(item.total_revenue || 0));
        const ordersData = branchData.map(item => parseInt(item.total_orders || 0));

        if (branchPerformanceChart) {
            branchPerformanceChart.destroy();
        }

        branchPerformanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue (₱)',
                        data: revenueData,
                        backgroundColor: colors.success,
                        borderRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders',
                        data: ordersData,
                        backgroundColor: colors.primary,
                        borderRadius: 6,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += '₱' + context.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 });
                                } else {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Revenue (₱)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Orders'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });
    }

    // Render Top Products Table
    function renderTopProductsTable(products) {
        const tbody = document.querySelector('#topProductsTable tbody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <p>No product data available</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.slice(0, 10).map((product, index) => `
            <tr>
                <td><strong>${index + 1}.</strong> ${escapeHtml(product.name)}</td>
                <td>${parseInt(product.total_sold).toLocaleString()}</td>
                <td><strong>₱${parseFloat(product.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
        `).join('');
    }

    // Render Low Stock Table
    function renderLowStockTable(lowStock) {
        const tbody = document.querySelector('#lowStockTable tbody');
        if (!tbody) return;

        if (lowStock.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-check-circle"></i>
                            <p>All products are well stocked!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = lowStock.map(item => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.variant_name || '-')}</td>
                <td>
                    <span class="badge ${item.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}">
                        ${item.stock_quantity}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Utility function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
