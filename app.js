// app.js - Main Application Logic

document.addEventListener('DOMContentLoaded', () => {

    // --- Elements ---
    const loginForm = document.getElementById('loginForm');
    const loginView = document.getElementById('loginView');
    const dashboardView = document.getElementById('dashboardView');

    // User Display Elements
    const displayUserName = document.getElementById('displayUserName');
    const displayUserInitials = document.getElementById('displayUserInitials');

    // Navigation Elements
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section-view');
    const currentSectionTitle = document.getElementById('currentSectionTitle');
    const currentSectionDesc = document.getElementById('currentSectionDesc');

    // UI Controls
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logoutBtn');

    // Player Elements
    const floatingPlayer = document.getElementById('floatingPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBar = document.getElementById('progressBar');

    let isPlaying = false;
    let progressInterval = null;

    // --- Login Flow ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('userName').value.trim();

        if (nameInput) {
            // Update UI
            displayUserName.textContent = nameInput;
            displayUserInitials.textContent = nameInput.charAt(0).toUpperCase();

            // Transition Views
            loginView.classList.remove('active-view');
            setTimeout(() => {
                loginView.classList.add('hidden');
                dashboardView.classList.remove('hidden');

                // Trigger reflow
                void dashboardView.offsetWidth;
                dashboardView.classList.add('active-view');

                // Initialize Charts once Dashboard is visible
                initCharts();

                // Show player after delay for impact
                setTimeout(() => {
                    floatingPlayer.classList.remove('hidden');
                }, 1000);
            }, 400); // Wait for fade out
        }
    });

    // --- Logout Flow ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dashboardView.classList.remove('active-view');
        floatingPlayer.classList.add('hidden');

        setTimeout(() => {
            dashboardView.classList.add('hidden');
            loginView.classList.remove('hidden');
            void loginView.offsetWidth;
            loginView.classList.add('active-view');

            // Reset form
            loginForm.reset();
        }, 400);
    });

    // --- Navigation Logic ---
    const sectionDescriptions = {
        'homeSection': "Welcome back! Here's your musical summary.",
        'searchSection': "Discover new tracks, artists, and playlists.",
        'songsSection': "Manage your personal music library.",
        'artistsSection': "Browse artists in your collection.",
        'albumsSection': "Explore full albums and compilations.",
        'genresSection': "Dive into different styles of music.",
        'usersSection': "Connect with the community."
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Clean active states
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Set new active state
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update Header Text
            const textContent = item.textContent.trim();
            currentSectionTitle.textContent = textContent === 'Home' ? 'Home Overview' : textContent;
            currentSectionDesc.textContent = sectionDescriptions[targetId] || "";

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }

            // Scroll to top
            document.querySelector('.content-scrollable').scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // --- Mobile Sidebar Toggle ---
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });

    // --- Player Logic (Fake Simulation) ---
    playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        const icon = playPauseBtn.querySelector('i');

        if (isPlaying) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            startProgress();
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            stopProgress();
        }
    });

    function startProgress() {
        if (!progressInterval) {
            progressInterval = setInterval(() => {
                let currentWidth = parseFloat(progressBar.style.width) || 0;
                if (currentWidth >= 100) {
                    currentWidth = 0;
                    isPlaying = false;
                    playPauseBtn.querySelector('i').className = 'fa-solid fa-play';
                    stopProgress();
                } else {
                    currentWidth += 0.5; // Simulate progress
                }
                progressBar.style.width = currentWidth + '%';
            }, 1000);
        }
    }

    function stopProgress() {
        clearInterval(progressInterval);
        progressInterval = null;
    }

    // Like Button Toggle
    document.querySelector('.like-btn').addEventListener('click', function () {
        this.classList.toggle('liked');
        const icon = this.querySelector('i');
        if (this.classList.contains('liked')) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
        } else {
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
        }
    });

    // --- Chart.js Initialization ---
    function initCharts() {
        // Only initialize if context exists and chart hasn't been created
        const trendsCtx = document.getElementById('listeningTrendsChart');
        const genresCtx = document.getElementById('genresDoughnutChart');

        if (!trendsCtx || !genresCtx) return;

        // Colors matching CSS variables
        const primaryColor = '#6366f1';
        const secondaryColor = '#0ea5e9';

        // Line Chart - Listening Trends
        new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Streams',
                    data: [120, 190, 150, 220, 180, 280, 250], // Mock data
                    borderColor: primaryColor,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4, // Smooth curves
                    pointBackgroundColor: '#fff',
                    pointBorderColor: primaryColor,
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5], color: 'rgba(0,0,0,0.05)' },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });

        // Doughnut Chart - Genres
        new Chart(genresCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pop', 'Hip-Hop', 'Rock', 'Electronic'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: [
                        primaryColor,
                        secondaryColor,
                        '#8b5cf6', // purple
                        '#14b8a6'  // teal
                    ],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' }
                    }
                }
            }
        });
    }

    // --- UI Controls (Modals, Toasts, Dropdowns) exposing globally ---
    window.appUI = {
        showToast: function (message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'error' ? 'circle-xmark' : 'circle-info'}"></i> <span>${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },
        openModal: function (title, bodyHTML, footerHTML = '') {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML = bodyHTML + footerHTML;
            document.getElementById('globalModal').classList.remove('hidden');
        },
        closeModal: function () {
            document.getElementById('globalModal').classList.add('hidden');
        },
        playNext: function () {
            this.showToast('Feature simulated for frontend demo.', 'info');
        }
    };

    // Close modal on backdrop click
    document.getElementById('globalModal').addEventListener('click', (e) => {
        if (e.target.id === 'globalModal') window.appUI.closeModal();
    });

    // Add Track Button functionality
    const btnAddSong = document.getElementById('btnAddSong');
    if (btnAddSong) {
        btnAddSong.addEventListener('click', () => {
            const body = `
                <div class="input-group">
                    <label>Track Title</label>
                    <input type="text" class="input-control" placeholder="e.g. Blinding Lights">
                </div>
                <div class="input-group">
                    <label>Artist</label>
                    <input type="text" class="input-control" placeholder="e.g. The Weeknd">
                </div>
            `;
            const footer = `
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="appUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="appUI.closeModal(); appUI.showToast('Track successfully added!', 'success')">Save Track</button>
                </div>
            `;
            window.appUI.openModal('Add New Track', body, footer);
        });
    }

    // Profile Dropdown functionality
    const topBarUser = document.querySelector('.topbar-user');
    const userDropdown = document.getElementById('userDropdownMenu');
    if (topBarUser && userDropdown) {
        topBarUser.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!topBarUser.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    // Logout from dropdown
    const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            userDropdown.classList.add('hidden');
            document.getElementById('logoutBtn').click();
        });
    }

    // Connect topbar notification icon to a Toast
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            window.appUI.showToast('You have 3 new playlist suggestions!', 'info');
        });
    }

    // Connect search button to a Toast
    const searchBtns = document.querySelectorAll('.hero-search-bar .btn, .topbar-search input');
    searchBtns.forEach(btn => {
        if (btn.tagName === 'INPUT') {
            btn.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.appUI.showToast('Search integrated with backend soon.', 'info');
            });
        } else {
            btn.addEventListener('click', () => window.appUI.showToast('Search integrated with backend soon.', 'info'));
        }
    });

    // Initialize mock generation for the UI placeholders just to make it look nice before backend integration
    function generateMockCards() { }
    generateMockCards();
});
