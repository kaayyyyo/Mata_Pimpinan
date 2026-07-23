/* ========================================================================
   Investasi dashboard — tabbed, sheet-driven view.
   Add a tab by adding one entry to `tabs`; rendering and loading are shared.
   ======================================================================== */
const InvestasiModule = {
  tabs: {
    target: { label: 'Target', title: 'Data Target Investasi', subtitle: 'Target investasi sesuai periode pelaporan' },
    realisasi: { label: 'Realisasi', title: 'Data Realisasi Investasi', subtitle: 'Realisasi investasi sesuai periode pelaporan' },
    historis_tahunan: { label: 'Historis Tahunan', title: 'Data Historis Tahunan', subtitle: 'Rekap perkembangan investasi tahunan' }
  },
  state: { activeTab: 'target', rawData: [], fields: [] },

  async render(container, rawArray, activeTab = 'target') {
    this.state.activeTab = this.tabs[activeTab] ? activeTab : 'target';
    this.state.rawData = Array.isArray(rawArray) ? rawArray : [];
    this.state.fields = SchemaDetector.detectFields(this.state.rawData);
    container.innerHTML = `
      <div class="investment-tabs" role="tablist" aria-label="Data investasi">
        ${Object.entries(this.tabs).map(([key, tab]) => `
          <button class="investment-tab ${key === this.state.activeTab ? 'active' : ''}" type="button" role="tab" aria-selected="${key === this.state.activeTab}" data-investment-tab="${key}">${tab.label}</button>
        `).join('')}
      </div>
      <div class="investment-tab-panel" id="investmentTabPanel" role="tabpanel"></div>
    `;
    this.renderTabContent();
    this.bindEvents(container);
  },

  renderTabContent() {
    const panel = document.getElementById('investmentTabPanel');
    if (!panel) return;
    const raw = this.state.rawData;
    const fields = this.state.fields;
    const tab = this.tabs[this.state.activeTab];
    const numericFields = fields.filter(field => /target|realisasi|nilai|jumlah|investasi/i.test(field));
    const chartFields = numericFields.slice(0, 2);

    panel.innerHTML = `
      <div class="investment-tab-content">
        <div class="stats-grid">
          ${chartFields.map(field => {
            const total = raw.reduce((sum, row) => sum + (parseFloat(row[field]) || 0), 0);
            return `<div class="stat-card stat-info"><div class="stat-info-wrapper"><span class="stat-label">Total ${field.replace(/_/g, ' ')}</span><span class="stat-value">${Utils.formatCurrency(total, true)}</span><span class="stat-trend neutral"><i class="fas fa-database"></i> Dari sheet ${tab.label}</span></div><div class="stat-icon"><i class="fas fa-chart-line"></i></div></div>`;
          }).join('')}
          <div class="stat-card"><div class="stat-info-wrapper"><span class="stat-label">Total Data</span><span class="stat-value">${raw.length} Record</span><span class="stat-trend neutral"><i class="fas fa-calendar-alt"></i> ${tab.label}</span></div><div class="stat-icon"><i class="fas fa-table"></i></div></div>
        </div>
        ${chartFields.length > 0 && raw.length > 0 ? `<div class="charts-grid-main"><div class="card-panel"><div class="card-header"><div><div class="card-title"><i class="fas fa-chart-bar" style="color: var(--primary);"></i> Ringkasan ${tab.label}</div><div class="card-subtitle">Perbandingan nilai per tahun atau periode</div></div></div><div class="chart-card-wrapper"><canvas id="chartInvestasiComparison"></canvas></div></div></div>` : ''}
        <div class="card-panel"><div class="card-header"><div><div class="card-title"><i class="fas fa-table" style="color: var(--secondary);"></i> ${tab.title}</div><div class="card-subtitle">${tab.subtitle}</div></div><button class="btn btn-outline" id="invExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button></div><div class="table-container"><div class="table-responsive"><table class="table" id="investasiTable"><thead><tr>${fields.map(field => `<th>${field.replace(/_/g, ' ')}</th>`).join('')}</tr></thead><tbody>${raw.length ? raw.map(row => `<tr>${fields.map(field => { const value = row[field]; return /target|realisasi|nilai|jumlah|investasi/i.test(field) ? `<td class="font-semibold" style="color: var(--primary);">${Utils.formatCurrency(value, true)}</td>` : `<td>${value ?? ''}</td>`; }).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(fields.length, 1)}" style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada data pada sheet ${tab.label}.</td></tr>`}</tbody></table></div></div></div>
      </div>
    `;
    if (chartFields.length && raw.length) this.renderChart(chartFields);
    this.bindExport();
  },

  renderChart(chartFields) {
    const labels = this.state.rawData.map((row, index) => String(row.Tahun || row.Periode || index + 1));
    ChartEngine.createBarChart('chartInvestasiComparison', labels, chartFields.map((field, index) => ({
      label: field.replace(/_/g, ' '), data: this.state.rawData.map(row => parseFloat(row[field]) || 0),
      backgroundColor: index === 0 ? ChartEngine.colors.primary : ChartEngine.colors.warning
    })));
  },

  bindEvents(container) {
    container.querySelectorAll('[data-investment-tab]').forEach(button => button.addEventListener('click', () => this.loadTab(button.dataset.investmentTab)));
  },

  async loadTab(tabKey) {
    if (!this.tabs[tabKey] || tabKey === this.state.activeTab) return;
    const panel = document.getElementById('investmentTabPanel');
    if (panel) panel.innerHTML = '<div class="investment-tab-loading"><i class="fas fa-circle-notch fa-spin"></i> Memuat data investasi...</div>';
    try {
      const response = await API.request('getInvestasi', { sheet: tabKey });
      if (!response.success) throw new Error(response.message || 'Gagal memuat data investasi.');
      this.state.activeTab = tabKey;
      this.state.rawData = Array.isArray(response.data) ? response.data : [];
      this.state.fields = SchemaDetector.detectFields(this.state.rawData);
      document.querySelectorAll('[data-investment-tab]').forEach(button => {
        const active = button.dataset.investmentTab === tabKey;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active);
      });
      this.renderTabContent();
    } catch (error) {
      console.error('[InvestasiModule] Tab load error:', error);
      if (panel) panel.innerHTML = `<div class="investment-tab-error"><i class="fas fa-triangle-exclamation"></i><span>${error.message || 'Koneksi ke Google Spreadsheet gagal.'}</span><button class="btn btn-outline btn-sm" onclick="InvestasiModule.loadTab('${tabKey}')">Coba Lagi</button></div>`;
    }
  },

  bindExport() {
    const button = document.getElementById('invExportBtn');
    if (!button) return;
    button.addEventListener('click', () => {
      const rows = this.state.rawData.map(row => this.state.fields.map(field => row[field]));
      rows.unshift(this.state.fields.map(field => field.replace(/_/g, ' ')));
      Utils.exportToCSV(`${this.state.activeTab}_Investasi_DPMPTSP`, rows);
    });
  }
};
