// app.js - Main Application Logic (Backend-Connected)

document.addEventListener('DOMContentLoaded', () => {

    // ── Elements ──────────────────────────────────────────────────────────────
    const loginForm          = document.getElementById('loginForm');
    const loginView          = document.getElementById('loginView');
    const dashboardView      = document.getElementById('dashboardView');
    const displayUserName    = document.getElementById('displayUserName');
    const displayUserInitials= document.getElementById('displayUserInitials');
    const navItems           = document.querySelectorAll('.nav-item');
    const sections           = document.querySelectorAll('.section-view');
    const currentSectionTitle= document.getElementById('currentSectionTitle');
    const currentSectionDesc = document.getElementById('currentSectionDesc');
    const mobileMenuBtn      = document.getElementById('mobileMenuBtn');
    const sidebar            = document.getElementById('sidebar');
    const logoutBtn          = document.getElementById('logoutBtn');
    const floatingPlayer     = document.getElementById('floatingPlayer');
    const playPauseBtn       = document.getElementById('playPauseBtn');
    const progressBar        = document.getElementById('progressBar');

    let isPlaying      = false;
    let progressInterval = null;
    let trendsChart    = null;
    let genresChart    = null;

    // ── Login Flow ────────────────────────────────────────────────────────────
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('userName').value.trim();
        if (nameInput) {
            displayUserName.textContent     = nameInput;
            displayUserInitials.textContent = nameInput.charAt(0).toUpperCase();

            loginView.classList.remove('active-view');
            setTimeout(() => {
                loginView.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                void dashboardView.offsetWidth;
                dashboardView.classList.add('active-view');

                // Load all data now that the dashboard is visible
                loadDashboardData();

                setTimeout(() => floatingPlayer.classList.remove('hidden'), 1000);
            }, 400);
        }
    });

    // ── Logout Flow ───────────────────────────────────────────────────────────
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dashboardView.classList.remove('active-view');
        floatingPlayer.classList.add('hidden');
        setTimeout(() => {
            dashboardView.classList.add('hidden');
            loginView.classList.remove('hidden');
            void loginView.offsetWidth;
            loginView.classList.add('active-view');
            loginForm.reset();
        }, 400);
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    const sectionDescriptions = {
        homeSection   : "Welcome back! Here's your musical summary.",
        searchSection : "Discover new tracks, artists, and playlists.",
        songsSection  : "Manage your personal music library.",
        artistsSection: "Browse artists in your collection.",
        albumsSection : "Explore full albums and compilations.",
        genresSection : "Dive into different styles of music.",
        usersSection  : "Connect with the community."
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            const txt = item.textContent.trim();
            currentSectionTitle.textContent = txt === 'Home' ? 'Home Overview' : txt;
            currentSectionDesc.textContent  = sectionDescriptions[targetId] || '';

            if (window.innerWidth <= 768) sidebar.classList.remove('show');
            document.querySelector('.content-scrollable').scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('show'));

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });

    // ── Player Logic ──────────────────────────────────────────────────────────
    playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        const icon = playPauseBtn.querySelector('i');
        if (isPlaying) {
            icon.classList.replace('fa-play', 'fa-pause');
            startProgress();
        } else {
            icon.classList.replace('fa-pause', 'fa-play');
            stopProgress();
        }
    });

    function startProgress() {
        if (!progressInterval) {
            progressInterval = setInterval(() => {
                let w = parseFloat(progressBar.style.width) || 0;
                if (w >= 100) {
                    w = 0; isPlaying = false;
                    playPauseBtn.querySelector('i').className = 'fa-solid fa-play';
                    stopProgress();
                } else { w += 0.5; }
                progressBar.style.width = w + '%';
            }, 1000);
        }
    }
    function stopProgress() { clearInterval(progressInterval); progressInterval = null; }

    document.querySelector('.like-btn').addEventListener('click', function () {
        this.classList.toggle('liked');
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-regular', !this.classList.contains('liked'));
        icon.classList.toggle('fa-solid',   this.classList.contains('liked'));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  BACKEND DATA LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    async function apiFetch(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`API error [${url}]:`, err);
            return null;
        }
    }

    async function loadDashboardData() {
        // Run all fetches in parallel
        const [
            streams, songs, artists, users,
            mostPlayed, topArtist, favAlbum,
            trends, topGenres
        ] = await Promise.all([
            apiFetch('/api/total-streams'),
            apiFetch('/api/songs'),
            apiFetch('/api/artists'),
            apiFetch('/api/users'),
            apiFetch('/api/most-played'),
            apiFetch('/api/top-artist'),
            apiFetch('/api/fav-album'),
            apiFetch('/api/listening-trends'),
            apiFetch('/api/top-genres')
        ]);

        // ── Stat Cards ────────────────────────────────────────────────────────
        if (streams) setText('statTotalStreams', streams.total_streams);
        if (songs)   setText('statTotalSongs',   songs.length);
        if (artists) setText('statTotalArtists', artists.length);
        if (users)   setText('statTotalUsers',   users.length);

        // ── Highlights ────────────────────────────────────────────────────────
        if (mostPlayed && mostPlayed.song_name) setText('statMostPlayedSong',   mostPlayed.song_name);
        if (topArtist  && topArtist.artist_name) setText('statMostPlayedArtist', topArtist.artist_name);
        if (favAlbum   && favAlbum.album_name)   setText('statFavAlbum',         favAlbum.album_name);

        // ── Charts ────────────────────────────────────────────────────────────
        if (trends)    renderTrendsChart(trends);
        if (topGenres) renderGenresChart(topGenres);

        // ── Tables / Sections ─────────────────────────────────────────────────
        if (songs)   renderSongsTable(songs);
        if (users)   renderUsersTable(users);
        if (artists) renderArtistsCards(artists);

        // Load albums & genres separately (not fetched above)
        const albums = await apiFetch('/api/albums');
        const genres = await apiFetch('/api/genres');
        if (albums) renderAlbumsCards(albums);
        if (genres) renderGenresCards(genres);

        // Update player track info with most played song
        if (mostPlayed && mostPlayed.song_name) {
            setText('playerTitle',  mostPlayed.song_name);
            setText('playerArtist', topArtist ? topArtist.artist_name : '—');
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '—';
    }

    // ── Listening Trends Line Chart ───────────────────────────────────────────
    function renderTrendsChart(data) {
        const ctx = document.getElementById('listeningTrendsChart');
        if (!ctx) return;
        if (trendsChart) trendsChart.destroy();

        const labels = data.map(r => r.day);
        const plays  = data.map(r => r.plays);

        trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Streams',
                    data: plays,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [5,5], color: 'rgba(0,0,0,0.05)' }, border: { display: false } },
                    x: { grid: { display: false }, border: { display: false } }
                }
            }
        });
    }

    // ── Genres Doughnut Chart ─────────────────────────────────────────────────
    function renderGenresChart(data) {
        const ctx = document.getElementById('genresDoughnutChart');
        if (!ctx) return;
        if (genresChart) genresChart.destroy();

        const palette = ['#6366f1','#0ea5e9','#8b5cf6','#14b8a6','#f59e0b','#ef4444'];
        genresChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(r => r.genre_name),
                datasets: [{
                    data: data.map(r => r.plays),
                    backgroundColor: data.map((_, i) => palette[i % palette.length]),
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } }
                }
            }
        });
    }

    // ── Songs Table ───────────────────────────────────────────────────────────
    function renderSongsTable(songs) {
        const tbody = document.getElementById('songsTableBody');
        if (!tbody) return;
        if (!songs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No songs found.</td></tr>';
            return;
        }
        tbody.innerHTML = songs.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.song_name}</strong><br><small>${s.artist_name}</small></td>
                <td>${s.album_name}</td>
                <td>${s.play_count}</td>
                <td>${formatDuration(s.duration)}</td>
                <td>
                    <button class="icon-btn" title="Play" onclick="appUI.showToast('Now playing: ${s.song_name}', 'info')">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="icon-btn" title="Like">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </td>
            </tr>`).join('');
    }

    // ── Users Table ───────────────────────────────────────────────────────────
    function renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No users found.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-color);
                             color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem">
                            ${u.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>${u.name}</strong>
                    </div>
                </td>
                <td>${u.country}</td>
                <td><span class="badge badge-success">Active</span></td>
                <td>${u.join_date}</td>
            </tr>`).join('');
    }

    // ── Artists Cards ─────────────────────────────────────────────────────────
    function renderArtistsCards(artists) {
        const container = document.getElementById('artistsContainer');
        if (!container) return;
        container.innerHTML = artists.map(a => `
            <div class="dashboard-card glass-panel" style="padding:1.5rem;text-align:center">
                <div style="width:60px;height:60px;border-radius:50%;background:var(--primary-gradient);
                     color:#fff;display:flex;align-items:center;justify-content:center;
                     font-size:1.5rem;margin:0 auto 1rem">
                    <i class="fa-solid fa-user-astronaut"></i>
                </div>
                <h3 style="margin-bottom:0.4rem">${a.artist_name}</h3>
                <p style="color:var(--text-muted);font-size:0.85rem">${a.total_songs} tracks &bull; ${a.total_plays} plays</p>
            </div>`).join('');
    }

    // ── Albums Cards ──────────────────────────────────────────────────────────
    function renderAlbumsCards(albums) {
        const container = document.getElementById('albumsContainer');
        if (!container) return;
        container.innerHTML = albums.map(al => `
            <div class="dashboard-card glass-panel" style="padding:1.5rem">
                <div style="width:60px;height:60px;border-radius:12px;background:var(--primary-gradient);
                     color:#fff;display:flex;align-items:center;justify-content:center;
                     font-size:1.5rem;margin-bottom:1rem">
                    <i class="fa-solid fa-record-vinyl"></i>
                </div>
                <h3 style="margin-bottom:0.25rem">${al.album_name}</h3>
                <p style="color:var(--text-muted);font-size:0.85rem">${al.artist_name}</p>
                <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem">
                    ${al.release_year} &bull; ${al.total_songs} tracks
                </p>
            </div>`).join('');
    }

    // ── Genres Cards ──────────────────────────────────────────────────────────
    function renderGenresCards(genres) {
        const container = document.getElementById('genresContainer');
        if (!container) return;
        const icons = { Romantic:'fa-heart', Pop:'fa-music', Rock:'fa-guitar',
                        Sad:'fa-face-sad-cry', Dance:'fa-person-dancing' };
        const colors = ['#6366f1','#0ea5e9','#8b5cf6','#14b8a6','#f59e0b'];
        container.innerHTML = genres.map((g, i) => `
            <div class="dashboard-card glass-panel" style="padding:1.5rem;text-align:center">
                <div style="width:56px;height:56px;border-radius:50%;background:${colors[i % colors.length]};
                     color:#fff;display:flex;align-items:center;justify-content:center;
                     font-size:1.4rem;margin:0 auto 0.75rem">
                    <i class="fa-solid ${icons[g.genre_name] || 'fa-headphones'}"></i>
                </div>
                <h3>${g.genre_name}</h3>
                <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.4rem">
                    ${g.total_songs} songs &bull; ${g.total_plays} plays
                </p>
            </div>`).join('');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function formatDuration(secs) {
        if (!secs) return '—';
        return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  UI CONTROLS (Modals, Toasts, Dropdowns)
    // ═══════════════════════════════════════════════════════════════════════════

    window.appUI = {
        showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const iconMap = { success: 'circle-check', error: 'circle-xmark', info: 'circle-info' };
            toast.innerHTML = `<i class="fa-solid fa-${iconMap[type] || 'circle-info'}"></i> <span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
        },
        openModal(title, bodyHTML, footerHTML = '') {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML = bodyHTML + footerHTML;
            document.getElementById('globalModal').classList.remove('hidden');
        },
        closeModal() {
            document.getElementById('globalModal').classList.add('hidden');
        }
    };

    document.getElementById('globalModal').addEventListener('click', (e) => {
        if (e.target.id === 'globalModal') window.appUI.closeModal();
    });

    // Add Track Button
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
                </div>`;
            const footer = `
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="appUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="appUI.closeModal(); appUI.showToast('Track added!', 'success')">Save Track</button>
                </div>`;
            window.appUI.openModal('Add New Track', body, footer);
        });
    }

    // Profile Dropdown
    const topBarUser    = document.querySelector('.topbar-user');
    const userDropdown  = document.getElementById('userDropdownMenu');
    if (topBarUser && userDropdown) {
        topBarUser.addEventListener('click', (e) => { e.stopPropagation(); userDropdown.classList.toggle('hidden'); });
        document.addEventListener('click', (e) => {
            if (!topBarUser.contains(e.target)) userDropdown.classList.add('hidden');
        });
    }

    const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            if (userDropdown) userDropdown.classList.add('hidden');
            document.getElementById('logoutBtn').click();
        });
    }

    // Notification
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => window.appUI.showToast('You have 3 new playlist suggestions!', 'info'));
    }

    // Search
    document.querySelectorAll('.hero-search-bar .btn, .topbar-search input').forEach(el => {
        if (el.tagName === 'INPUT') {
            el.addEventListener('keypress', (e) => { if (e.key === 'Enter') window.appUI.showToast('Search integrated with backend soon.', 'info'); });
        } else {
            el.addEventListener('click', () => window.appUI.showToast('Search integrated with backend soon.', 'info'));
        }
    });
});
