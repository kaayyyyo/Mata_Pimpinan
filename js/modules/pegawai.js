/* ==========================================================================
   PORTAL MATA PIMPINAN - Data Pegawai Dashboard Module
   --------------------------------------------------------------------------
   STRICT SPREADSHEET SCHEMA DRIVEN:
   Primary columns: No, Nama Pegawai, NIP, Status Pegawai, Golongan/Ruang
   Hide Jabatan and Bidang UNLESS present in the API response data.
   ========================================================================== */

const PegawaiModule = {
  state: {
    rawData: [],
    filteredData: [],
    fields: [],
    searchQuery: '',
    statusFilter: 'Semua',
    sortColumn: null,
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 10
  },

  async render(container, rawArray) {
    const raw = Array.isArray(rawArray) ? rawArray : [];
    this.state.rawData = raw;
    this.state.filteredData = [...raw];
    this.state.fields = SchemaDetector.detectFields(raw);
    this.state.currentPage = 1;

    const F = this.state.fields;
    const hasStatus   = F.includes('Status Pegawai');
    const hasGolongan = F.includes('Golongan/Ruang');

    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid" id="pegawaiSummaryCards"></div>

      <!-- Charts (Rendered ONLY if required fields exist) -->
      ${(hasStatus || hasGolongan) ? `
      <div class="charts-grid-main">
        ${hasStatus ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-user-shield" style="color: var(--primary);"></i> Distribusi Status Pegawai</div>
              <div class="card-subtitle">Berdasarkan status kepegawaian dari spreadsheet</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartPegawaiStatus"></canvas></div>
        </div>
        ` : ''}
        ${hasGolongan ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-layer-group" style="color: var(--accent-purple);"></i> Distribusi Golongan / Ruang</div>
              <div class="card-subtitle">Frekuensi pegawai berdasarkan kepangkatan</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartPegawaiGolongan"></canvas></div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Data Table -->
      <div class="card-panel">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-address-book" style="color: var(--secondary);"></i> Daftar Pegawai</div>
            <div class="card-subtitle">Kolom Terdeteksi: ${F.join(', ')}</div>
          </div>
          <div class="flex gap-3 flex-wrap">
            ${hasStatus ? `
            <select id="pegFilterStatus" class="form-select" style="width: 180px; height: 38px; padding: 0.5rem 0.75rem;">
              <option value="Semua">Semua Status</option>
            </select>
            ` : ''}
            <div class="search-wrapper" style="width: 220px;">
              <i class="fas fa-search"></i>
              <input type="text" id="pegSearchInput" class="form-control" placeholder="Cari nama / NIP...">
            </div>
            <button class="btn btn-outline" id="pegExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
          </div>
        </div>
        <div class="table-container">
          <div class="table-responsive">
            <table class="table" id="pegawaiTable">
              <thead>
                <tr>
                  ${F.map(f => `<th class="sortable" data-col="${f}">${f} <i class="fas fa-sort"></i></th>`).join('')}
                </tr>
              </thead>
              <tbody id="pegawaiTableBody"></tbody>
            </table>
          </div>
          <div class="table-controls" id="pegawaiTableControls"></div>
        </div>
      </div>
    `;

    this.calculateSummary();
    if (hasStatus || hasGolongan) this.renderCharts();
    this.populateStatusFilter();
    this.renderTable();
    this.bindEvents();
  },

  calculateSummary() {
    const data = this.state.rawData;
    const total = data.length;
    const F = this.state.fields;
    const hasStatus = F.includes('Status Pegawai');

    let statusHTML = '';
    if (hasStatus) {
      const counts = {};
      data.forEach(row => {
        const s = row['Status Pegawai'] || 'Lainnya';
        counts[s] = (counts[s] || 0) + 1;
      });
      statusHTML = Object.entries(counts).map(([label, count]) => `
        <div class="stat-card">
          <div class="stat-info-wrapper">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${count} Pegawai</span>
            <span class="stat-trend neutral"><i class="fas fa-user-shield"></i> ${total > 0 ? Math.round((count/total)*100) : 0}% Dari Total</span>
          </div>
          <div class="stat-icon"><i class="fas fa-id-card"></i></div>
        </div>
      `).join('');
    }

    const summaryCardsEl = document.getElementById('pegawaiSummaryCards');
    if (summaryCardsEl) {
      summaryCardsEl.innerHTML = `
        <div class="stat-card stat-success">
          <div class="stat-info-wrapper">
            <span class="stat-label">Total Pegawai</span>
            <span class="stat-value">${total} SDM</span>
            <span class="stat-trend up"><i class="fas fa-users"></i> Live dari Spreadsheet</span>
          </div>
          <div class="stat-icon"><i class="fas fa-users-viewfinder"></i></div>
        </div>
        ${statusHTML}
      `;
    }
  },

  renderCharts() {
    const data = this.state.rawData;
    const F = this.state.fields;

    if (F.includes('Status Pegawai') && document.getElementById('chartPegawaiStatus')) {
      const counts = {};
      data.forEach(row => { const s = row['Status Pegawai'] || 'Lainnya'; counts[s] = (counts[s] || 0) + 1; });
      ChartEngine.createDonutChart('chartPegawaiStatus', Object.keys(counts), Object.values(counts));
    }

    if (F.includes('Golongan/Ruang') && document.getElementById('chartPegawaiGolongan')) {
      const counts = {};
      data.forEach(row => { const g = row['Golongan/Ruang'] || 'Lainnya'; counts[g] = (counts[g] || 0) + 1; });
      ChartEngine.createBarChart('chartPegawaiGolongan', Object.keys(counts), [
        { label: 'Jumlah Pegawai', data: Object.values(counts), backgroundColor: ChartEngine.colors.primary }
      ]);
    }
  },

  populateStatusFilter() {
    const el = document.getElementById('pegFilterStatus');
    if (!el) return;
    const statuses = new Set();
    this.state.rawData.forEach(row => { if (row['Status Pegawai']) statuses.add(row['Status Pegawai']); });
    el.innerHTML = `<option value="Semua">Semua Status</option>` +
      Array.from(statuses).map(s => `<option value="${s}">${s}</option>`).join('');
  },

  applyFilterAndSearch() {
    const query = this.state.searchQuery.toLowerCase();
    const status = this.state.statusFilter;

    this.state.filteredData = this.state.rawData.filter(row => {
      const name = String(row['Nama Pegawai'] || row['Nama'] || '').toLowerCase();
      const nip = String(row['NIP'] || '').toLowerCase();
      const matchSearch = !query || name.includes(query) || nip.includes(query);
      const matchStatus = status === 'Semua' || String(row['Status Pegawai'] || '') === status;
      return matchSearch && matchStatus;
    });

    if (this.state.sortColumn) this.sortData();
    this.state.currentPage = 1;
    this.renderTable();
  },

  sortData() {
    const col = this.state.sortColumn;
    const dir = this.state.sortDirection === 'asc' ? 1 : -1;
    this.state.filteredData.sort((a, b) => {
      let va = a[col], vb = b[col];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  },

  renderTable() {
    const tbody = document.getElementById('pegawaiTableBody');
    const controls = document.getElementById('pegawaiTableControls');
    if (!tbody || !controls) return;

    const F = this.state.fields;
    const start = (this.state.currentPage - 1) * this.state.pageSize;
    const end = start + this.state.pageSize;
    const page = this.state.filteredData.slice(start, end);
    const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize) || 1;

    if (page.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${F.length || 1}"><div class="empty-state"><i class="fas fa-folder-open"></i><div class="empty-state-title">Tidak ada data pegawai</div><div class="empty-state-text">Ubah filter pencarian Anda.</div></div></td></tr>`;
      controls.innerHTML = '';
      return;
    }

    tbody.innerHTML = page.map(row => `
      <tr>
        ${F.map(f => {
          const val = row[f];
          if (f === 'No' || f === 'no') return `<td><strong>#${val}</strong></td>`;
          if (f === 'Nama Pegawai' || f === 'Nama') return `<td><div class="font-semibold" style="color: var(--primary);">${val || ''}</div></td>`;
          if (f === 'NIP') return `<td><code>${val || ''}</code></td>`;
          if (f === 'Status Pegawai') return `<td>${Utils.getStatusBadge(val)}</td>`;
          if (f === 'Golongan/Ruang' || f === 'Golongan') return `<td><span class="badge badge-primary">${val || ''}</span></td>`;
          return `<td>${val !== null && val !== undefined ? val : ''}</td>`;
        }).join('')}
      </tr>
    `).join('');

    controls.innerHTML = `
      <div class="table-info-text">Menampilkan <strong>${start+1}</strong> - <strong>${Math.min(end, this.state.filteredData.length)}</strong> dari <strong>${this.state.filteredData.length}</strong> pegawai</div>
      <div class="pagination">
        <button class="page-btn" id="pegPrevBtn" ${this.state.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
        <span class="font-semibold" style="font-size: 0.8rem; margin: 0 0.5rem; color: var(--text-muted);">Halaman ${this.state.currentPage} / ${totalPages}</span>
        <button class="page-btn" id="pegNextBtn" ${this.state.currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
      </div>
    `;

    document.getElementById('pegPrevBtn').addEventListener('click', () => { if (this.state.currentPage > 1) { this.state.currentPage--; this.renderTable(); } });
    document.getElementById('pegNextBtn').addEventListener('click', () => { if (this.state.currentPage < totalPages) { this.state.currentPage++; this.renderTable(); } });
  },

  bindEvents() {
    const searchEl = document.getElementById('pegSearchInput');
    if (searchEl) searchEl.addEventListener('input', e => { this.state.searchQuery = e.target.value; this.applyFilterAndSearch(); });

    const statusEl = document.getElementById('pegFilterStatus');
    if (statusEl) statusEl.addEventListener('change', e => { this.state.statusFilter = e.target.value; this.applyFilterAndSearch(); });

    document.querySelectorAll('#pegawaiTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (this.state.sortColumn === col) { this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc'; }
        else { this.state.sortColumn = col; this.state.sortDirection = 'asc'; }
        document.querySelectorAll('#pegawaiTable th.sortable i').forEach(i => { i.className = 'fas fa-sort'; });
        th.querySelector('i').className = this.state.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        this.applyFilterAndSearch();
      });
    });

    const exportBtn = document.getElementById('pegExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const F = this.state.fields;
        const rows = this.state.filteredData.map(row => F.map(f => row[f]));
        rows.unshift(F);
        Utils.exportToCSV('Data_Pegawai_DPMPTSP', rows);
      });
    }
  }
};
