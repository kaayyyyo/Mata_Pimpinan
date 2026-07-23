/* ==========================================================================
   PORTAL MATA PIMPINAN - Ringkasan Hasil Rapat Dashboard Module
   --------------------------------------------------------------------------
   STRICT SPREADSHEET SCHEMA DRIVEN:
   Generate statistics ONLY from existing spreadsheet columns.
   ========================================================================== */

const RapatModule = {
  state: {
    rawData: [],
    filteredData: [],
    fields: [],
    searchQuery: '',
    kategoriFilter: 'Semua',
    statusFilter: 'Semua',
    sortColumn: null,
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 8
  },

  async render(container, rawArray) {
    const raw = Array.isArray(rawArray) ? rawArray : [];
    this.state.rawData = raw;
    this.state.filteredData = [...raw];
    this.state.fields = SchemaDetector.detectFields(raw);
    this.state.currentPage = 1;

    const F = this.state.fields;
    const kategoriCol = F.find(f => f.toLowerCase().includes('kategori') || f.toLowerCase().includes('jenis'));
    const statusCol   = F.find(f => f.toLowerCase().includes('status'));
    const dateCol     = F.find(f => f.toLowerCase().includes('tanggal') || f.toLowerCase().includes('date'));

    container.innerHTML = `
      <!-- Dynamic Summary Cards -->
      <div class="stats-grid" id="rapatSummaryCards">
        <div class="stat-card">
          <div class="stat-info-wrapper">
            <span class="stat-label">Total Rapat / Agenda</span>
            <span class="stat-value">${raw.length} Agenda</span>
            <span class="stat-trend neutral"><i class="fas fa-comments"></i> Terdaftar</span>
          </div>
          <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
        </div>

        ${statusCol ? `
        <div class="stat-card stat-warning">
          <div class="stat-info-wrapper">
            <span class="stat-label">Status Terdaftar</span>
            <span class="stat-value">${new Set(raw.map(r => r[statusCol]).filter(Boolean)).size} Status</span>
            <span class="stat-trend neutral"><i class="fas fa-spinner"></i> Distribusi Status</span>
          </div>
          <div class="stat-icon"><i class="fas fa-hourglass-half"></i></div>
        </div>
        ` : ''}

        ${kategoriCol ? `
        <div class="stat-card stat-info">
          <div class="stat-info-wrapper">
            <span class="stat-label">Variasi ${kategoriCol}</span>
            <span class="stat-value">${new Set(raw.map(r => r[kategoriCol]).filter(Boolean)).size} Kategori</span>
            <span class="stat-trend up"><i class="fas fa-layer-group"></i> Jenis Rapat</span>
          </div>
          <div class="stat-icon"><i class="fas fa-tags"></i></div>
        </div>
        ` : ''}

        ${dateCol && raw.length > 0 ? `
        <div class="stat-card stat-success">
          <div class="stat-info-wrapper">
            <span class="stat-label">Agenda Terakhir</span>
            <span class="stat-value">${Utils.formatDate(raw[0][dateCol])}</span>
            <span class="stat-trend up"><i class="fas fa-clock"></i> Tanggal Rapat</span>
          </div>
          <div class="stat-icon"><i class="fas fa-history"></i></div>
        </div>
        ` : ''}
      </div>

      <!-- Charts (Rendered ONLY if columns exist) -->
      ${(kategoriCol || statusCol) ? `
      <div class="charts-grid-equal">
        ${kategoriCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-chart-bar" style="color: var(--primary);"></i> Frekuensi per ${kategoriCol}</div>
              <div class="card-subtitle">Frekuensi rapat berdasarkan ${kategoriCol}</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartRapatKategori"></canvas></div>
        </div>
        ` : ''}

        ${statusCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-chart-pie" style="color: var(--warning);"></i> Status Rapat</div>
              <div class="card-subtitle">Proporsi status rapat</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartRapatStatus"></canvas></div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Table Section -->
      <div class="card-panel">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-file-invoice" style="color: var(--secondary);"></i> Daftar Ringkasan Rapat</div>
            <div class="card-subtitle">Kolom: ${F.join(', ')}</div>
          </div>
          <div class="flex gap-3 flex-wrap">
            ${kategoriCol ? `
            <select id="rptKategoriSelect" class="form-select" style="width: 160px; height: 38px; padding: 0.5rem 0.75rem;">
              <option value="Semua">Semua Kategori</option>
            </select>
            ` : ''}
            ${statusCol ? `
            <select id="rptStatusSelect" class="form-select" style="width: 150px; height: 38px; padding: 0.5rem 0.75rem;">
              <option value="Semua">Semua Status</option>
            </select>
            ` : ''}
            <div class="search-wrapper" style="width: 200px;">
              <i class="fas fa-search"></i>
              <input type="text" id="rptSearchInput" class="form-control" placeholder="Cari data...">
            </div>
            <button class="btn btn-outline" id="rptExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-responsive">
            <table class="table" id="rapatTable">
              <thead>
                <tr>
                  ${F.map(k => `<th class="sortable" data-col="${k}">${k.replace(/_/g, ' ')} <i class="fas fa-sort"></i></th>`).join('')}
                </tr>
              </thead>
              <tbody id="rapatTableBody"></tbody>
            </table>
          </div>
          <div class="table-controls" id="rapatTableControls"></div>
        </div>
      </div>
    `;

    if (kategoriCol || statusCol) this.renderCharts(kategoriCol, statusCol);
    this.populateDynamicFilters(kategoriCol, statusCol);
    this.renderTable();
    this.bindEvents(kategoriCol, statusCol);
  },

  renderCharts(kategoriCol, statusCol) {
    const list = this.state.rawData;

    if (kategoriCol && document.getElementById('chartRapatKategori')) {
      const katCounts = {};
      list.forEach(item => {
        const k = item[kategoriCol] || 'Lainnya';
        katCounts[k] = (katCounts[k] || 0) + 1;
      });
      ChartEngine.createBarChart('chartRapatKategori', Object.keys(katCounts), [
        { label: 'Jumlah Pertemuan', data: Object.values(katCounts), backgroundColor: ChartEngine.colors.primary }
      ]);
    }

    if (statusCol && document.getElementById('chartRapatStatus')) {
      const statCounts = {};
      list.forEach(item => {
        const s = item[statusCol] || 'Lainnya';
        statCounts[s] = (statCounts[s] || 0) + 1;
      });
      ChartEngine.createDonutChart('chartRapatStatus', Object.keys(statCounts), Object.values(statCounts));
    }
  },

  populateDynamicFilters(kategoriCol, statusCol) {
    if (kategoriCol) {
      const katEl = document.getElementById('rptKategoriSelect');
      if (katEl) {
        const cats = new Set();
        this.state.rawData.forEach(item => { if (item[kategoriCol]) cats.add(item[kategoriCol]); });
        katEl.innerHTML = `<option value="Semua">Semua Kategori</option>` + Array.from(cats).map(c => `<option value="${c}">${c}</option>`).join('');
      }
    }

    if (statusCol) {
      const statEl = document.getElementById('rptStatusSelect');
      if (statEl) {
        const stats = new Set();
        this.state.rawData.forEach(item => { if (item[statusCol]) stats.add(item[statusCol]); });
        statEl.innerHTML = `<option value="Semua">Semua Status</option>` + Array.from(stats).map(s => `<option value="${s}">${s}</option>`).join('');
      }
    }
  },

  applyFilterAndSearch(kategoriCol, statusCol) {
    const query = this.state.searchQuery.toLowerCase();
    const kategori = this.state.kategoriFilter;
    const status = this.state.statusFilter;

    this.state.filteredData = this.state.rawData.filter(item => {
      const rowStr = Object.values(item).join(' ').toLowerCase();
      const matchSearch = !query || rowStr.includes(query);
      const matchKategori = kategori === 'Semua' || (kategoriCol && String(item[kategoriCol] || '').toLowerCase() === kategori.toLowerCase());
      const matchStatus = status === 'Semua' || (statusCol && String(item[statusCol] || '').toLowerCase() === status.toLowerCase());
      return matchSearch && matchKategori && matchStatus;
    });

    if (this.state.sortColumn) this.sortData();
    this.state.currentPage = 1;
    this.renderTable();
  },

  sortData() {
    const col = this.state.sortColumn;
    const dir = this.state.sortDirection === 'asc' ? 1 : -1;
    this.state.filteredData.sort((a, b) => {
      let valA = a[col], valB = b[col];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  },

  renderTable() {
    const tbody = document.getElementById('rapatTableBody');
    const controls = document.getElementById('rapatTableControls');
    if (!tbody || !controls) return;

    const F = this.state.fields;
    const startIdx = (this.state.currentPage - 1) * this.state.pageSize;
    const endIdx = startIdx + this.state.pageSize;
    const pageData = this.state.filteredData.slice(startIdx, endIdx);
    const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize) || 1;

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${F.length || 1}"><div class="empty-state"><i class="fas fa-folder-open"></i><div class="empty-state-title">Tidak ada agenda rapat</div><div class="empty-state-text">Ubah filter pencarian Anda.</div></div></td></tr>`;
      controls.innerHTML = '';
      return;
    }

    tbody.innerHTML = pageData.map(item => `
      <tr>
        ${F.map(k => {
          const val = item[k];
          const lower = k.toLowerCase();
          if (lower.includes('status')) return `<td>${Utils.getStatusBadge(val)}</td>`;
          if (lower.includes('tanggal') || lower.includes('date')) return `<td>${Utils.formatDate(val)}</td>`;
          return `<td>${val !== null && val !== undefined ? val : ''}</td>`;
        }).join('')}
      </tr>
    `).join('');

    controls.innerHTML = `
      <div class="table-info-text">Menampilkan <strong>${startIdx + 1}</strong> - <strong>${Math.min(endIdx, this.state.filteredData.length)}</strong> dari <strong>${this.state.filteredData.length}</strong> agenda</div>
      <div class="pagination">
        <button class="page-btn" id="rptPrevBtn" ${this.state.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
        <span class="font-semibold" style="font-size: 0.8rem; margin: 0 0.5rem; color: var(--text-muted);">Halaman ${this.state.currentPage} / ${totalPages}</span>
        <button class="page-btn" id="rptNextBtn" ${this.state.currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
      </div>
    `;

    document.getElementById('rptPrevBtn').addEventListener('click', () => { if (this.state.currentPage > 1) { this.state.currentPage--; this.renderTable(); } });
    document.getElementById('rptNextBtn').addEventListener('click', () => { if (this.state.currentPage < totalPages) { this.state.currentPage++; this.renderTable(); } });
  },

  bindEvents(kategoriCol, statusCol) {
    const searchEl = document.getElementById('rptSearchInput');
    if (searchEl) searchEl.addEventListener('input', (e) => { this.state.searchQuery = e.target.value; this.applyFilterAndSearch(kategoriCol, statusCol); });

    const kategoriEl = document.getElementById('rptKategoriSelect');
    if (kategoriEl) kategoriEl.addEventListener('change', (e) => { this.state.kategoriFilter = e.target.value; this.applyFilterAndSearch(kategoriCol, statusCol); });

    const statusEl = document.getElementById('rptStatusSelect');
    if (statusEl) statusEl.addEventListener('change', (e) => { this.state.statusFilter = e.target.value; this.applyFilterAndSearch(kategoriCol, statusCol); });

    document.querySelectorAll('#rapatTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (this.state.sortColumn === col) { this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc'; }
        else { this.state.sortColumn = col; this.state.sortDirection = 'asc'; }
        document.querySelectorAll('#rapatTable th.sortable i').forEach(icon => { icon.className = 'fas fa-sort'; });
        th.querySelector('i').className = this.state.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        this.applyFilterAndSearch(kategoriCol, statusCol);
      });
    });

    const exportBtn = document.getElementById('rptExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const F = this.state.fields;
        const rows = this.state.filteredData.map(item => F.map(k => item[k]));
        rows.unshift(F);
        Utils.exportToCSV('Hasil_Rapat_DPMPTSP', rows);
      });
    }
  }
};
