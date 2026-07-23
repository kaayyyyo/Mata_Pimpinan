/* Retribusi PBG: one live dataset, two modular frontend views. */
const PBGModule = {
  tabs: { ringkasan: 'Ringkasan', data: 'Data Retribusi' },
  state: { rawData: [], filteredData: [], fields: [], activeTab: 'ringkasan', searchQuery: '', statusFilter: 'Semua', yearFilter: 'Semua', monthFilter: 'Semua', sortColumn: null, sortDirection: 'asc', currentPage: 1, pageSize: 100 },

  async render(container, rawArray) {
    this.state.rawData = Array.isArray(rawArray) ? rawArray : [];
    this.state.fields = SchemaDetector.detectFields(this.state.rawData);
    this.state.activeTab = this.tabs[this.state.activeTab] ? this.state.activeTab : 'ringkasan';
    this.resetDataView();
    container.innerHTML = `<div class="pbg-tabs" role="tablist" aria-label="Tampilan Retribusi PBG">${Object.entries(this.tabs).map(([key, label]) => `<button type="button" class="pbg-tab ${key === this.state.activeTab ? 'active' : ''}" role="tab" aria-selected="${key === this.state.activeTab}" data-pbg-tab="${key}">${label}</button>`).join('')}</div><div id="pbgTabPanel" class="pbg-tab-panel" role="tabpanel"></div>`;
    this.renderActiveTab();
    this.bindTabEvents(container);
  },

  resetDataView() {
    Object.assign(this.state, { filteredData: [...this.state.rawData], searchQuery: '', statusFilter: 'Semua', yearFilter: 'Semua', monthFilter: 'Semua', sortColumn: null, sortDirection: 'asc', currentPage: 1 });
  },

  isDateField(field) { return /tgl|tanggal|date|timestamp/i.test(field); },
  isCurrencyField(field) { return /nilai|retribusi|setoran|denda|nominal/i.test(field) && !this.isDateField(field); },

  renderActiveTab() {
    const panel = document.getElementById('pbgTabPanel');
    if (!panel) return;
    panel.innerHTML = `<div class="pbg-tab-content">${this.state.activeTab === 'ringkasan' ? this.summaryMarkup() : this.dataMarkup()}</div>`;
    if (this.state.activeTab === 'ringkasan') this.renderCharts();
    else { this.populateFilters(); this.renderTable(); this.bindDataEvents(); }
  },

  summaryMarkup() {
    const fields = this.state.fields;
    const raw = this.state.rawData;
    const numericFields = fields.filter(field => this.isCurrencyField(field));
    const jenisField = fields.find(field => /jenis/i.test(field));
    return `<div class="stats-grid" id="pbgSummaryCards"><div class="stat-card"><div class="stat-info-wrapper"><span class="stat-label">Total Record</span><span class="stat-value">${raw.length} Transaksi</span><span class="stat-trend neutral"><i class="fas fa-file-invoice"></i> Terdaftar</span></div><div class="stat-icon"><i class="fas fa-receipt"></i></div></div>${numericFields.map(field => `<div class="stat-card stat-info"><div class="stat-info-wrapper"><span class="stat-label">Total ${field.replace(/_/g, ' ')}</span><span class="stat-value">${Utils.formatCurrency(raw.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0), true)}</span><span class="stat-trend neutral"><i class="fas fa-calculator"></i> Dari Spreadsheet</span></div><div class="stat-icon"><i class="fas fa-wallet"></i></div></div>`).join('')}</div>${(numericFields.length || jenisField) ? `<div class="charts-grid-main">${numericFields.length ? `<div class="card-panel"><div class="card-header"><div><div class="card-title"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Ringkasan Capaian</div><div class="card-subtitle">Nilai target dan realisasi berdasarkan data retribusi</div></div></div><div class="chart-card-wrapper"><canvas id="chartPBGRevenue"></canvas></div></div>` : ''}${jenisField ? `<div class="card-panel"><div class="card-header"><div><div class="card-title"><i class="fas fa-chart-pie" style="color:var(--accent-teal)"></i> Distribusi ${jenisField}</div><div class="card-subtitle">Frekuensi berdasarkan kategori</div></div></div><div class="chart-card-wrapper"><canvas id="chartPBGKategori"></canvas></div></div>` : ''}</div>` : ''}`;
  },

  dataMarkup() {
    const fields = this.state.fields;
    return `<div class="card-panel"><div class="card-header"><div><div class="card-title"><i class="fas fa-receipt" style="color:var(--secondary)"></i> Data Retribusi</div><div class="card-subtitle">Cari, filter, urutkan, dan telusuri seluruh data retribusi.</div></div><button class="btn btn-outline" id="pbgExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button></div><div class="pbg-data-filters"><div class="search-wrapper"><i class="fas fa-search"></i><input type="search" id="pbgSearchInput" class="form-control" placeholder="Cari data retribusi..."></div><select id="pbgFilterYear" class="form-select"><option value="Semua">Semua Tahun</option></select><select id="pbgFilterMonth" class="form-select"><option value="Semua">Semua Bulan</option>${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((month, index) => `<option value="${index + 1}">${month}</option>`).join('')}</select>${fields.some(field => /status/i.test(field)) ? '<select id="pbgFilterStatus" class="form-select"><option value="Semua">Semua Status</option></select>' : ''}</div><div class="table-container"><div class="table-responsive"><table class="table" id="pbgTable"><thead><tr>${fields.map(field => `<th class="sortable" data-col="${field}">${field.replace(/_/g, ' ')} <i class="fas fa-sort"></i></th>`).join('')}</tr></thead><tbody id="pbgTableBody"></tbody></table></div><div class="table-controls" id="pbgTableControls"></div></div></div>`;
  },

  renderCharts() {
    const fields = this.state.fields;
    const raw = this.state.rawData;
    const numericFields = fields.filter(field => this.isCurrencyField(field));
    const jenisField = fields.find(field => /jenis/i.test(field));
    if (numericFields.length && document.getElementById('chartPBGRevenue')) ChartEngine.createBarChart('chartPBGRevenue', raw.slice(0, 10).map((row, index) => row['No. SKRD'] || row['Nomor SKRD'] || row.Nama || `#${index + 1}`), numericFields.map((field, index) => ({ label: field.replace(/_/g, ' '), data: raw.slice(0, 10).map(row => parseFloat(row[field]) || 0), backgroundColor: ChartEngine.colors.palette[index % ChartEngine.colors.palette.length] })));
    if (jenisField && document.getElementById('chartPBGKategori')) { const counts = {}; raw.forEach(row => { const value = row[jenisField] || 'Lainnya'; counts[value] = (counts[value] || 0) + 1; }); ChartEngine.createDonutChart('chartPBGKategori', Object.keys(counts), Object.values(counts)); }
  },

  getRowPeriod(row) {
    const year = row.Tahun || row.tahun;
    if (year) return { year: String(year).match(/\d{4}/)?.[0] || '', month: '' };
    const dateField = this.state.fields.find(field => /tgl|tanggal|date|timestamp/i.test(field));
    const value = String(row[dateField] || '');
    const matchedYear = value.match(/\d{4}/);
    const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
    let month = months.findIndex(name => value.toLowerCase().includes(name)) + 1;
    if (!month) { const parsed = new Date(value); month = Number.isNaN(parsed.getTime()) ? 0 : parsed.getMonth() + 1; }
    return { year: matchedYear ? matchedYear[0] : '', month: month ? String(month) : '' };
  },

  populateFilters() {
    const years = [...new Set(this.state.rawData.map(row => this.getRowPeriod(row).year).filter(Boolean))].sort().reverse();
    const yearSelect = document.getElementById('pbgFilterYear');
    if (yearSelect) yearSelect.innerHTML = '<option value="Semua">Semua Tahun</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
    const statusField = this.state.fields.find(field => /status/i.test(field));
    const statusSelect = document.getElementById('pbgFilterStatus');
    if (statusField && statusSelect) { const statuses = [...new Set(this.state.rawData.map(row => row[statusField]).filter(Boolean))]; statusSelect.innerHTML = '<option value="Semua">Semua Status</option>' + statuses.map(status => `<option value="${status}">${status}</option>`).join(''); }
  },

  applyFilters() {
    const query = this.state.searchQuery.toLowerCase();
    const statusField = this.state.fields.find(field => /status/i.test(field));
    this.state.filteredData = this.state.rawData.filter(row => { const period = this.getRowPeriod(row); return (!query || Object.values(row).join(' ').toLowerCase().includes(query)) && (this.state.yearFilter === 'Semua' || period.year === this.state.yearFilter) && (this.state.monthFilter === 'Semua' || period.month === this.state.monthFilter) && (this.state.statusFilter === 'Semua' || String(row[statusField] || '') === this.state.statusFilter); });
    if (this.state.sortColumn) this.sortData();
    this.state.currentPage = 1;
    this.renderTable();
  },

  sortData() { const { sortColumn: column, sortDirection } = this.state; const direction = sortDirection === 'asc' ? 1 : -1; this.state.filteredData.sort((a, b) => { const rawA = String(a[column] ?? '').replace(/[^\d.-]/g, ''); const rawB = String(b[column] ?? '').replace(/[^\d.-]/g, ''); const bothNumbers = rawA !== '' && rawB !== '' && !Number.isNaN(Number(rawA)) && !Number.isNaN(Number(rawB)); const result = bothNumbers ? Number(rawA) - Number(rawB) : String(a[column] ?? '').localeCompare(String(b[column] ?? ''), 'id', { numeric: true }); return result * direction; }); },

  renderTable() {
    const tbody = document.getElementById('pbgTableBody'); const controls = document.getElementById('pbgTableControls'); if (!tbody || !controls) return;
    const fields = this.state.fields; const total = this.state.filteredData.length; const totalPages = Math.max(1, Math.ceil(total / this.state.pageSize)); this.state.currentPage = Math.min(this.state.currentPage, totalPages); const start = (this.state.currentPage - 1) * this.state.pageSize; const pageData = this.state.filteredData.slice(start, start + this.state.pageSize);
    tbody.innerHTML = pageData.length ? pageData.map(row => `<tr>${fields.map(field => { const value = row[field]; if (this.isDateField(field)) return `<td>${Utils.formatDate(value)}</td>`; if (this.isCurrencyField(field)) return `<td class="font-semibold" style="color:var(--primary)">${Utils.formatCurrency(value)}</td>`; if (/status/i.test(field)) return `<td>${Utils.getStatusBadge(value)}</td>`; return `<td>${value ?? ''}</td>`; }).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(1, fields.length)}"><div class="empty-state"><i class="fas fa-folder-open"></i><div class="empty-state-title">Tidak ada transaksi</div><div class="empty-state-text">Ubah filter pencarian Anda.</div></div></td></tr>`;
    if (!total) { controls.innerHTML = ''; return; }
    const numbers = []; const first = Math.max(1, this.state.currentPage - 2); const last = Math.min(totalPages, first + 4); for (let page = first; page <= last; page++) numbers.push(page);
    controls.innerHTML = `<div class="table-info-text">Menampilkan <strong>${start + 1}–${Math.min(start + this.state.pageSize, total)}</strong> dari <strong>${total}</strong> data</div><div class="pagination"><button class="page-btn" data-page="1" ${this.state.currentPage === 1 ? 'disabled' : ''}>First</button><button class="page-btn" data-page="${this.state.currentPage - 1}" ${this.state.currentPage === 1 ? 'disabled' : ''}>Previous</button>${numbers.map(page => `<button class="page-btn ${page === this.state.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`).join('')}<button class="page-btn" data-page="${this.state.currentPage + 1}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Next</button><button class="page-btn" data-page="${totalPages}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Last</button></div>`;
    controls.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { this.state.currentPage = Number(button.dataset.page); this.renderTable(); }));
  },

  bindTabEvents(container) { container.querySelectorAll('[data-pbg-tab]').forEach(button => button.addEventListener('click', () => { const key = button.dataset.pbgTab; if (key === this.state.activeTab) return; this.state.activeTab = key; container.querySelectorAll('[data-pbg-tab]').forEach(tab => { const active = tab.dataset.pbgTab === key; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active); }); this.renderActiveTab(); })); },
  bindDataEvents() {
    const bind = (id, property) => { const element = document.getElementById(id); if (element) element.addEventListener('input', event => { this.state[property] = event.target.value; this.applyFilters(); }); return element; };
    bind('pbgSearchInput', 'searchQuery'); ['pbgFilterYear', 'pbgFilterMonth', 'pbgFilterStatus'].forEach(id => { const element = document.getElementById(id); if (element) element.addEventListener('change', event => { this.state[{ pbgFilterYear: 'yearFilter', pbgFilterMonth: 'monthFilter', pbgFilterStatus: 'statusFilter' }[id]] = event.target.value; this.applyFilters(); }); });
    document.querySelectorAll('#pbgTable th.sortable').forEach(header => header.addEventListener('click', () => { const column = header.dataset.col; this.state.sortDirection = this.state.sortColumn === column && this.state.sortDirection === 'asc' ? 'desc' : 'asc'; this.state.sortColumn = column; this.applyFilters(); }));
    const exportButton = document.getElementById('pbgExportBtn'); if (exportButton) exportButton.addEventListener('click', () => Utils.exportToCSV('Retribusi_PBG_DPMPTSP', [this.state.fields, ...this.state.filteredData.map(row => this.state.fields.map(field => row[field]))]));
  }
};
