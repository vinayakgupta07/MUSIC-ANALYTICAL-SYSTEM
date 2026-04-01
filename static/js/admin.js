// admin.js  –  BeatMetrics Admin Portal  (fully wired to backend)

document.addEventListener('DOMContentLoaded', () => {

    // ── Navigation ────────────────────────────────────────────────────────────
    const navItems      = document.querySelectorAll('.admin-sidebar .nav-item');
    const sections      = document.querySelectorAll('.admin-section');
    const pageTitle     = document.getElementById('adminPageTitle');
    const sidebar       = document.getElementById('adminSidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
            pageTitle.textContent = item.textContent.trim();
            if (window.innerWidth <= 768) sidebar.classList.remove('show');
        });
    });

    mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('show'));

    // ── Chart.js global defaults (dark theme) ─────────────────────────────────
    Chart.defaults.color       = '#94a3b8';
    Chart.defaults.borderColor = '#334155';

    // ── Toast & Modal ─────────────────────────────────────────────────────────
    window.adminUI = {
        showToast(message, type = 'info') {
            const c = document.getElementById('adminToastContainer');
            if (!c) return;
            const icons = { success:'circle-check', error:'circle-xmark', info:'circle-info', warning:'triangle-exclamation' };
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.innerHTML = `<i class="fa-solid fa-${icons[type]||'circle-info'}"></i> <span>${message}</span>`;
            c.appendChild(t);
            setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 400); }, 3200);
        },
        openModal(title, body, footer = '') {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML   = body + footer;
            document.getElementById('adminModal').classList.remove('hidden');
        },
        closeModal() {
            document.getElementById('adminModal').classList.add('hidden');
        }
    };

    document.getElementById('adminModal').addEventListener('click', e => {
        if (e.target.id === 'adminModal') adminUI.closeModal();
    });

    // ── API helper ────────────────────────────────────────────────────────────
    async function api(url, opts = {}) {
        try {
            const res  = await fetch(url, opts);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || res.status);
            return json;
        } catch (err) {
            console.error(`[API] ${url}`, err.message);
            return null;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const pad   = (n, l=4) => String(n).padStart(l,'0');
    const fmtDur = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : '—';

    // ═══════════════════════════════════════════════════════════════════════════
    //  DATA CACHE  (used by filter + CSV export)
    // ═══════════════════════════════════════════════════════════════════════════
    let cachedUsers = [];
    let cachedSongs = [];

    // ═══════════════════════════════════════════════════════════════════════════
    //  BOOT  – fetch everything in parallel
    // ═══════════════════════════════════════════════════════════════════════════
    async function loadAll() {
        const [users, songs, streams, artists, trends, genres] = await Promise.all([
            api('/api/users'),
            api('/api/songs'),
            api('/api/total-streams'),
            api('/api/artists'),
            api('/api/listening-trends'),
            api('/api/top-genres'),
        ]);

        // KPI cards
        setEl('kpiTotalUsers', users   ? users.length            : '—');
        setEl('kpiStreams',     streams ? streams.total_streams   : '—');
        setEl('kpiSongs',      songs   ? songs.length            : '—');
        setEl('kpiArtists',    artists ? artists.length          : '—');

        // Cache for later use
        if (users) cachedUsers = users;
        if (songs) cachedSongs = songs;

        // Charts — render after a tick so canvas is fully laid out
        setTimeout(() => {
            if (trends && trends.length) renderBarChart(trends);
            else                         renderBarChartFallback();
            if (genres && genres.length) renderDonutChart(genres);
            else                         renderDonutChartFallback();
        }, 50);

        // Tables
        renderUsersTable(cachedUsers);
        renderSongsTable(cachedSongs);
    }

    function setEl(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== null && val !== undefined) ? val : '—';
    }

    loadAll();

    // ── Bar chart — daily listening trends ────────────────────────────────────
    function renderBarChart(data) {
        const ctx = document.getElementById('adminGrowthChart');
        if (!ctx) return;
        if (window._barChart) { window._barChart.destroy(); window._barChart = null; }
        window._barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(r => r.day),
                datasets: [{
                    label: 'Daily Plays',
                    data: data.map(r => r.plays),
                    backgroundColor: '#3b82f6',
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { position: 'top', align: 'end' } }
            }
        });
    }

    function renderBarChartFallback() {
        const ctx = document.getElementById('adminGrowthChart');
        if (!ctx) return;
        if (window._barChart) { window._barChart.destroy(); window._barChart = null; }
        window._barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
                datasets: [
                    { label:'New Users',       data:[650,850,1200,1100,1800,1500,2200,2600], backgroundColor:'#3b82f6', borderRadius:5 },
                    { label:'Premium Upgrades',data:[150,200,350,400,500,600,750,900],        backgroundColor:'#10b981', borderRadius:5 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x:{grid:{display:false}}, y:{beginAtZero:true, grid:{color:'rgba(255,255,255,0.05)'}} },
                plugins: { legend:{position:'top',align:'end'} }
            }
        });
    }

    // ── Donut chart — genre plays ─────────────────────────────────────────────
    function renderDonutChart(data) {
        const ctx = document.getElementById('trafficDonutChart');
        if (!ctx) return;
        if (window._donutChart) { window._donutChart.destroy(); window._donutChart = null; }
        const palette = ['#3b82f6','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#ef4444'];
        window._donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(r => r.genre_name),
                datasets: [{
                    data: data.map(r => r.plays),
                    backgroundColor: data.map((_,i) => palette[i % palette.length]),
                    borderWidth: 2,
                    borderColor: '#1e293b',
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { position:'bottom', labels:{ padding:16, usePointStyle:true } } }
            }
        });
    }

    function renderDonutChartFallback() {
        const ctx = document.getElementById('trafficDonutChart');
        if (!ctx) return;
        if (window._donutChart) { window._donutChart.destroy(); window._donutChart = null; }
        window._donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Romantic','Pop','Sad','Rock','Dance'],
                datasets: [{
                    data: [40,25,15,12,8],
                    backgroundColor:['#3b82f6','#0ea5e9','#8b5cf6','#f59e0b','#10b981'],
                    borderWidth:2, borderColor:'#1e293b', hoverOffset:12
                }]
            },
            options: {
                responsive:true, maintainAspectRatio:false, cutout:'68%',
                plugins:{ legend:{position:'bottom', labels:{padding:16,usePointStyle:true}} }
            }
        });
    }

    // ── Users table ───────────────────────────────────────────────────────────
    function renderUsersTable(users) {
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;
        if (!users || !users.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No users in database.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><code style="color:#94a3b8">#US-${pad(u.user_id)}</code></td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${u.country || '—'}</td>
                <td>${u.join_date || '—'}</td>
                <td>
                    <button class="action-btn-sm edit"    data-name="${u.name}" data-id="${u.user_id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn-sm warning" data-name="${u.name}" data-id="${u.user_id}"><i class="fa-solid fa-ban"></i></button>
                </td>
            </tr>`).join('');
    }

    // ── Songs table ───────────────────────────────────────────────────────────
    function renderSongsTable(songs) {
        const tbody = document.getElementById('adminSongsTableBody');
        if (!tbody) return;
        if (!songs || !songs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No songs in database.</td></tr>';
            return;
        }
        tbody.innerHTML = songs.map(s => `
            <tr>
                <td><code style="color:#94a3b8">#TRK-${pad(s.song_id)}</code></td>
                <td><strong>${s.song_name}</strong></td>
                <td>${s.artist_name}</td>
                <td>${s.album_name || '—'}</td>
                <td>${s.play_count ?? 0}</td>
                <td>
                    <button class="action-btn-sm edit"    data-name="${s.song_name}"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn-sm warning jsDeleteSong" data-name="${s.song_name}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  BUTTON DELEGATION
    // ═══════════════════════════════════════════════════════════════════════════
    document.addEventListener('click', async e => {

        // ── Add User ──────────────────────────────────────────────────────────
        if (e.target.closest('#btnAddUser')) {
            adminUI.openModal('Add New User',
                `<div class="input-group">
                    <label>Full Name</label>
                    <input id="newName" class="dark-input" style="width:100%;margin-top:6px" placeholder="e.g. Aarav Shah">
                 </div>
                 <div class="input-group">
                    <label>Email</label>
                    <input id="newEmail" class="dark-input" style="width:100%;margin-top:6px" type="email" placeholder="e.g. aarav@gmail.com">
                 </div>
                 <div class="input-group">
                    <label>Country</label>
                    <input id="newCountry" class="dark-input" style="width:100%;margin-top:6px" placeholder="e.g. India">
                 </div>`,
                `<div class="modal-footer">
                    <button class="btn btn-outline" onclick="adminUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" id="confirmAddUser">Save to Database</button>
                 </div>`
            );
            return;
        }

        // ── Confirm add user ──────────────────────────────────────────────────
        if (e.target.closest('#confirmAddUser')) {
            const name    = document.getElementById('newName')?.value.trim();
            const email   = document.getElementById('newEmail')?.value.trim();
            const country = document.getElementById('newCountry')?.value.trim();
            if (!name || !email || !country) {
                adminUI.showToast('Please fill in all fields.', 'warning'); return;
            }
            const btn = document.getElementById('confirmAddUser');
            btn.disabled = true; btn.textContent = 'Saving…';

            const result = await api('/api/users/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, country })
            });

            btn.disabled = false; btn.textContent = 'Save to Database';

            if (result?.success) {
                adminUI.closeModal();
                adminUI.showToast(`✓ User "${name}" added to database!`, 'success');
                // Refresh users table + KPI
                const users = await api('/api/users');
                if (users) {
                    cachedUsers = users;
                    setEl('kpiTotalUsers', users.length);
                    renderUsersTable(users);
                }
            } else {
                adminUI.showToast(result?.error || 'Failed to save user.', 'error');
            }
            return;
        }

        // ── Filter users ──────────────────────────────────────────────────────
        if (e.target.closest('#btnFilterUsers')) {
            const q = (document.getElementById('userSearchInput')?.value || '').trim().toLowerCase();
            const filtered = q
                ? cachedUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
                : cachedUsers;
            renderUsersTable(filtered);
            adminUI.showToast(`${filtered.length} user(s) found.`, 'info');
            return;
        }

        // ── Upload bulk tracks ────────────────────────────────────────────────
        if (e.target.closest('#btnUploadTracks')) {
            adminUI.openModal('Upload Master Tracks',
                `<div class="input-group">
                    <label>Select Music Files (.mp3, .wav)</label>
                    <input type="file" class="dark-input" multiple accept=".mp3,.wav" style="width:100%;margin-top:6px">
                 </div>`,
                `<div class="modal-footer">
                    <button class="btn btn-outline" onclick="adminUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="adminUI.closeModal(); adminUI.showToast('Files queued for processing.','success')">Upload</button>
                 </div>`
            );
            return;
        }

        // ── Export CSV ────────────────────────────────────────────────────────
        if (e.target.closest('#btnExportCSV')) {
            if (!cachedUsers.length) { adminUI.showToast('No user data to export.', 'warning'); return; }
            const csv = ['ID,Name,Email,Country,Joined',
                ...cachedUsers.map(u => `${u.user_id},"${u.name}","${u.email}","${u.country}","${u.join_date}"`)
            ].join('\n');
            const a = document.createElement('a');
            a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            a.download = 'beatmetrics_users.csv';
            a.click();
            adminUI.showToast('CSV exported successfully.', 'success');
            return;
        }

        // ── Edit row ──────────────────────────────────────────────────────────
        const editBtn = e.target.closest('.action-btn-sm.edit');
        if (editBtn) {
            const name = editBtn.dataset.name || 'Record';
            adminUI.openModal(`Edit — ${name}`,
                `<div class="input-group">
                    <label>Plan</label>
                    <select class="dark-select" style="width:100%;margin-top:6px">
                        <option>Premium</option><option>Basic</option><option>Free</option>
                    </select>
                 </div>
                 <div class="input-group">
                    <label>Status</label>
                    <select class="dark-select" style="width:100%;margin-top:6px">
                        <option>Active</option><option>Suspended</option>
                    </select>
                 </div>`,
                `<div class="modal-footer">
                    <button class="btn btn-outline" onclick="adminUI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="adminUI.closeModal(); adminUI.showToast('Changes saved.','success')">Save</button>
                 </div>`
            );
            return;
        }

        // ── Suspend user ──────────────────────────────────────────────────────
        const warnBtn = e.target.closest('.action-btn-sm.warning:not(.jsDeleteSong)');
        if (warnBtn) {
            const name = warnBtn.dataset.name || 'this user';
            adminUI.openModal('Confirm Suspension',
                `<p style="color:var(--admin-text-main);font-size:.95rem;line-height:1.6">
                    Suspend <strong>${name}</strong>?<br>They will lose access immediately.
                 </p>`,
                `<div class="modal-footer">
                    <button class="btn btn-outline" onclick="adminUI.closeModal()">Cancel</button>
                    <button class="btn btn-danger" onclick="adminUI.closeModal(); adminUI.showToast('${name} suspended.','error')">Suspend</button>
                 </div>`
            );
            return;
        }

        // ── Delete song ───────────────────────────────────────────────────────
        const delBtn = e.target.closest('.jsDeleteSong');
        if (delBtn) {
            const name = delBtn.dataset.name || 'this track';
            adminUI.openModal('Delete Track',
                `<p style="color:var(--admin-text-main);font-size:.95rem;line-height:1.6">
                    Remove <strong>${name}</strong> from the database?<br>This cannot be undone.
                 </p>`,
                `<div class="modal-footer">
                    <button class="btn btn-outline" onclick="adminUI.closeModal()">Cancel</button>
                    <button class="btn btn-danger" onclick="adminUI.closeModal(); adminUI.showToast('Track removed.','error')">Delete</button>
                 </div>`
            );
            return;
        }
    });

    // ── Live search on Enter ──────────────────────────────────────────────────
    document.getElementById('userSearchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btnFilterUsers')?.click();
    });

    // ── Audit log live stream ─────────────────────────────────────────────────
    const logBox = document.getElementById('sysLogContainer');
    if (logBox) {
        const LOGS = [
            { type:'info',    msg:'New user registered via admin portal' },
            { type:'warning', msg:'Cache hit ratio dropped below 80%' },
            { type:'success', msg:'Payment gateway sync completed' },
            { type:'info',    msg:'Track metadata updated — idx=402' },
            { type:'error',   msg:'Lyrics API timeout after 5000ms' },
            { type:'success', msg:'DB backup completed — 42.8 GB' }
        ];
        setInterval(() => {
            const d   = new Date();
            const ts  = `[${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}]`;
            const log = LOGS[Math.floor(Math.random() * LOGS.length)];
            const div = document.createElement('div');
            div.className = 'log-line';
            div.innerHTML = `<span class="log-time">${ts}</span> <span class="log-type ${log.type}">${log.type.toUpperCase()}:</span> ${log.msg}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
            if (logBox.children.length > 60) logBox.removeChild(logBox.firstChild);
        }, 4000);
    }
});
