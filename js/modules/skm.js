/* ==========================================================================
   PORTAL MATA PIMPINAN - Monitoring SKM / IKM Dashboard Module
   --------------------------------------------------------------------------
   STRICT SPREADSHEET SCHEMA DRIVEN:
   Generate statistics computed ONLY from:
   - Tanggal / Timestamp
   - Pendidikan
   - Pekerjaan
   - J/K / Jenis Kelamin / Gender
   - Usia
   - U1 - U9
   ========================================================================== */

const SKMModule = {
  state: {
    rawData: [],
    filteredData: [],
    fields: [],
    searchQuery: '',
    genderFilter: 'Semua',
    sortColumn: null,
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 8
  },

  unsurNames: {
    u1: 'Persyaratan',
    u2: 'Prosedur',
    u3: 'Waktu',
    u4: 'Biaya/Tarif',
    u5: 'Produk Spesifikasi',
    u6: 'Kompetensi Pelaksana',
    u7: 'Perilaku Pelaksana',
    u8: 'Pengaduan',
    u9: 'Sarana & Prasarana'
  },

  async render(container, rawArray) {
    const raw = Array.isArray(rawArray) ? rawArray : [];
    this.state.rawData = raw;
    this.state.filteredData = [...raw];
    this.state.fields = SchemaDetector.detectFields(raw);
    this.state.currentPage = 1;

    const F = this.state.fields;
    const genderCol = F.find(f => { const l = f.toLowerCase(); return l === 'j/k' || l.includes('gender') || l.includes('kelamin'); });
    const pendCol = F.find(f => f.toLowerCase().includes('pendidikan'));
    const pekCol = F.find(f => f.toLowerCase().includes('pekerjaan'));
    const usiaCol = F.find(f => f.toLowerCase().includes('usia'));
    const hasUnsur = F.some(f => /^u[1-9]$/i.test(f));

    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid" id="skmSummaryCards"></div>

      <!-- Dynamic Charts Generated Strictly from Available API Data -->
      <div class="charts-grid-main">
        ${hasUnsur ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-spider" style="color: var(--accent-teal);"></i> Radar Mutu Unsur Pelayanan (U1–U9)</div>
              <div class="card-subtitle">Nilai rata-rata per unsur dari survei</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartSKMUnsur"></canvas></div>
        </div>
        ` : ''}

        ${genderCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-users" style="color: var(--primary);"></i> Distribusi Jenis Kelamin (${genderCol})</div>
              <div class="card-subtitle">Proporsi jenis kelamin responden</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartSKMGender"></canvas></div>
        </div>
        ` : ''}

        ${pendCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-graduation-cap" style="color: var(--warning);"></i> Sebaran Pendidikan (${pendCol})</div>
              <div class="card-subtitle">Tingkat pendidikan responden</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartSKMPendidikan"></canvas></div>
        </div>
        ` : ''}

        ${pekCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-briefcase" style="color: var(--accent-purple);"></i> Sebaran Pekerjaan (${pekCol})</div>
              <div class="card-subtitle">Pekerjaan responden</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartSKMPekerjaan"></canvas></div>
        </div>
        ` : ''}

        ${usiaCol ? `
        <div class="card-panel">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fas fa-child-reaching" style="color: var(--secondary);"></i> Sebaran Usia (${usiaCol})</div>
              <div class="card-subtitle">Kelompok usia responden</div>
            </div>
          </div>
          <div class="chart-card-wrapper"><canvas id="chartSKMUsia"></canvas></div>
        </div>
        ` : ''}
      </div>

      <!-- Table Section -->
      <div class="card-panel">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-comments" style="color: var(--secondary);"></i> Data Responden SKM</div>
            <div class="card-subtitle">Kolom: ${F.join(', ')}</div>
          </div>
          <div class="flex gap-3 flex-wrap">
            ${genderCol ? `
            <select id="skmGenderSelect" class="form-select" style="width: 160px; height: 38px; padding: 0.5rem 0.75rem;">
              <option value="Semua">Semua Gender</option>
            </select>
            ` : ''}
            <div class="search-wrapper" style="width: 240px;">
              <i class="fas fa-search"></i>
              <input type="text" id="skmSearchInput" class="form-control" placeholder="Cari data...">
            </div>
            <button class="btn btn-outline" id="skmExportBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-responsive">
            <table class="table" id="skmTable">
              <thead>
                <tr>
                  ${F.filter(k => !/^u[1-9]$/i.test(k)).map(k => `
                    <th class="sortable" data-col="${k}">${k} <i class="fas fa-sort"></i></th>
                  `).join('')}
                  ${hasUnsur ? `<th>Rata-rata</th><th>IKM</th>` : ''}
                </tr>
              </thead>
              <tbody id="skmTableBody"></tbody>
            </table>
          </div>
          <div class="table-controls" id="skmTableControls"></div>
        </div>
      </div>
    `;

    this.calculateSummary(hasUnsur);
    this.renderCharts(hasUnsur, genderCol, pendCol, pekCol, usiaCol);
    if (genderCol) this.populateGenderFilter(genderCol);
    this.renderTable(genderCol, hasUnsur);
    this.bindEvents(genderCol);
  },

  calculateSummary(hasUnsur) {
    const list = this.state.rawData;
    const totalRespondents = list.length;
    const cardsEl = document.getElementById('skmSummaryCards');
    if (!cardsEl) return;

    let averageSatisfactionScore = '0.00';
    let ikmConversion = '0.00';
    let kategori = 'Cukup';

    if (hasUnsur && totalRespondents > 0) {
      let sumTotalAverages = 0;
      list.forEach(item => {
        let sumUnsur = 0, count = 0;
        for (let i = 1; i <= 9; i++) {
          const key = Object.keys(item).find(k => k.toLowerCase() === 'u' + i);
          if (key) { sumUnsur += parseFloat(item[key]) || 0; count++; }
        }
        sumTotalAverages += count > 0 ? (sumUnsur / count) : 0;
      });

      const averageScore = sumTotalAverages / totalRespondents;
      averageSatisfactionScore = averageScore.toFixed(2);
      ikmConversion = (averageScore * 25).toFixed(2);

      if (ikmConversion >= 88.31) kategori = 'Sangat Baik (A)';
      else if (ikmConversion >= 76.61) kategori = 'Baik (B)';
      else if (ikmConversion >= 65.0) kategori = 'Kurang Baik (C)';
      else kategori = 'Tidak Baik (D)';
    }

    cardsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-info-wrapper">
          <span class="stat-label">Total Responden</span>
          <span class="stat-value">${totalRespondents} Pengguna</span>
          <span class="stat-trend neutral"><i class="fas fa-poll-h"></i> Partisipasi Survei</span>
        </div>
        <div class="stat-icon"><i class="fas fa-users"></i></div>
      </div>

      ${hasUnsur ? `
      <div class="stat-card stat-success">
        <div class="stat-info-wrapper">
          <span class="stat-label">Rata-rata Skor Kepuasan</span>
          <span class="stat-value" style="color: var(--success);">${averageSatisfactionScore} / 4.00</span>
          <span class="stat-trend up"><i class="fas fa-award"></i> IKM: ${ikmConversion} (${kategori})</span>
        </div>
        <div class="stat-icon"><i class="fas fa-face-smile"></i></div>
      </div>
      ` : ''}
    `;
  },

  renderCharts(hasUnsur, genderCol, pendCol, pekCol, usiaCol) {
    const list = this.state.rawData;
    const total = list.length;

    if (hasUnsur && document.getElementById('chartSKMUnsur')) {
      const elementSums = {};
      for (let i = 1; i <= 9; i++) elementSums['u' + i] = 0;

      list.forEach(item => {
        for (let i = 1; i <= 9; i++) {
          const key = Object.keys(item).find(k => k.toLowerCase() === 'u' + i);
          if (key) elementSums['u' + i] += parseFloat(item[key]) || 0;
        }
      });

      const radarLabels = Object.keys(this.unsurNames).map(k => `${k.toUpperCase()}: ${this.unsurNames[k]}`);
      const radarData = Object.keys(this.unsurNames).map(k => (total > 0 ? (elementSums[k] / total).toFixed(2) : 0));

      ChartEngine.createRadarChart('chartSKMUnsur', radarLabels, radarData, 'Nilai Mutu Unsur');
    }

    if (genderCol && document.getElementById('chartSKMGender')) {
      const genderCounts = {};
      list.forEach(item => {
        const g = item[genderCol] || 'Lainnya';
        genderCounts[g] = (genderCounts[g] || 0) + 1;
      });
      ChartEngine.createDonutChart('chartSKMGender', Object.keys(genderCounts), Object.values(genderCounts));
    }

    if (pendCol && document.getElementById('chartSKMPendidikan')) {
      const eduCounts = {};
      list.forEach(item => {
        const e = item[pendCol] || 'Lainnya';
        eduCounts[e] = (eduCounts[e] || 0) + 1;
      });
      ChartEngine.createBarChart('chartSKMPendidikan', Object.keys(eduCounts), [
        { label: 'Jumlah Responden', data: Object.values(eduCounts), backgroundColor: ChartEngine.colors.warning }
      ]);
    }

    if (pekCol && document.getElementById('chartSKMPekerjaan')) {
      const occCounts = {};
      list.forEach(item => {
        const o = item[pekCol] || 'Lainnya';
        occCounts[o] = (occCounts[o] || 0) + 1;
      });
      ChartEngine.createBarChart('chartSKMPekerjaan', Object.keys(occCounts), [
        { label: 'Jumlah Responden', data: Object.values(occCounts), backgroundColor: ChartEngine.colors.accentPurple }
      ]);
    }

    if (usiaCol && document.getElementById('chartSKMUsia')) {
      const usiaCounts = {};
      list.forEach(item => {
        const u = item[usiaCol] || 'Lainnya';
        usiaCounts[u] = (usiaCounts[u] || 0) + 1;
      });
      ChartEngine.createBarChart('chartSKMUsia', Object.keys(usiaCounts), [
        { label: 'Jumlah Responden', data: Object.values(usiaCounts), backgroundColor: ChartEngine.colors.secondary }
      ]);
    }
  },

  populateGenderFilter(genderCol) {
    const genderEl = document.getElementById('skmGenderSelect');
    if (!genderEl) return;
    const genders = new Set();
    this.state.rawData.forEach(item => { if (item[genderCol]) genders.add(item[genderCol]); });
    genderEl.innerHTML = `<option value="Semua">Semua Gender</option>` + Array.from(genders).map(g => `<option value="${g}">${g}</option>`).join('');
  },

  applyFilterAndSearch(genderCol, hasUnsur) {
    const query = this.state.searchQuery.toLowerCase();
    const gender = this.state.genderFilter;

    this.state.filteredData = this.state.rawData.filter(item => {
      const rowStr = Object.values(item).join(' ').toLowerCase();
      const itemGender = genderCol ? String(item[genderCol] || '') : '';
      const matchSearch = !query || rowStr.includes(query);
      const matchGender = gender === 'Semua' || itemGender.toLowerCase() === gender.toLowerCase();
      return matchSearch && matchGender;
    });

    if (this.state.sortColumn) this.sortData();
    this.state.currentPage = 1;
    this.renderTable(genderCol, hasUnsur);
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

  renderTable(genderCol, hasUnsur) {
    const tbody = document.getElementById('skmTableBody');
    const controls = document.getElementById('skmTableControls');
    if (!tbody || !controls) return;

    const F = this.state.fields;
    const displayKeys = F.filter(k => !/^u[1-9]$/i.test(k));
    const startIdx = (this.state.currentPage - 1) * this.state.pageSize;
    const endIdx = startIdx + this.state.pageSize;
    const pageData = this.state.filteredData.slice(startIdx, endIdx);
    const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize) || 1;

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${displayKeys.length + (hasUnsur ? 2 : 0)}"><div class="empty-state"><i class="fas fa-folder-open"></i><div class="empty-state-title">Tidak ada responden</div><div class="empty-state-text">Ubah filter pencarian Anda.</div></div></td></tr>`;
      controls.innerHTML = '';
      return;
    }

    tbody.innerHTML = pageData.map(item => {
      let avg = 0, ikm = 0;
      if (hasUnsur) {
        let sumUnsur = 0, count = 0;
        for (let i = 1; i <= 9; i++) {
          const key = Object.keys(item).find(k => k.toLowerCase() === 'u' + i);
          if (key) { sumUnsur += parseFloat(item[key]) || 0; count++; }
        }
        avg = count > 0 ? (sumUnsur / count) : 0;
        ikm = avg * 25;
      }

      return `
        <tr>
          ${displayKeys.map(k => {
            const val = item[k];
            const lower = k.toLowerCase();
            if (lower.includes('tanggal') || lower.includes('timestamp')) return `<td>${Utils.formatDate(val)}</td>`;
            if (lower.includes('saran')) return `<td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic;" title="${val}">${val || ''}</td>`;
            return `<td>${val !== null && val !== undefined ? val : ''}</td>`;
          }).join('')}
          ${hasUnsur ? `
            <td class="font-bold">${avg.toFixed(2)}</td>
            <td><span class="badge ${ikm >= 88.31 ? 'badge-success' : 'badge-info'} font-bold">${ikm.toFixed(1)}</span></td>
          ` : ''}
        </tr>
      `;
    }).join('');

    controls.innerHTML = `
      <div class="table-info-text">Menampilkan <strong>${startIdx + 1}</strong> - <strong>${Math.min(endIdx, this.state.filteredData.length)}</strong> dari <strong>${this.state.filteredData.length}</strong> responden</div>
      <div class="pagination">
        <button class="page-btn" id="skmPrevBtn" ${this.state.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
        <span class="font-semibold" style="font-size: 0.8rem; margin: 0 0.5rem; color: var(--text-muted);">Halaman ${this.state.currentPage} / ${totalPages}</span>
        <button class="page-btn" id="skmNextBtn" ${this.state.currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
      </div>
    `;

    document.getElementById('skmPrevBtn').addEventListener('click', () => { if (this.state.currentPage > 1) { this.state.currentPage--; this.renderTable(genderCol, hasUnsur); } });
    document.getElementById('skmNextBtn').addEventListener('click', () => { if (this.state.currentPage < totalPages) { this.state.currentPage++; this.renderTable(genderCol, hasUnsur); } });
  },

  bindEvents(genderCol) {
    const searchEl = document.getElementById('skmSearchInput');
    if (searchEl) searchEl.addEventListener('input', (e) => { this.state.searchQuery = e.target.value; this.applyFilterAndSearch(genderCol, this.state.fields.some(f => /^u[1-9]$/i.test(f))); });

    const genderEl = document.getElementById('skmGenderSelect');
    if (genderEl) genderEl.addEventListener('change', (e) => { this.state.genderFilter = e.target.value; this.applyFilterAndSearch(genderCol, this.state.fields.some(f => /^u[1-9]$/i.test(f))); });

    document.querySelectorAll('#skmTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (this.state.sortColumn === col) { this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc'; }
        else { this.state.sortColumn = col; this.state.sortDirection = 'asc'; }
        document.querySelectorAll('#skmTable th.sortable i').forEach(icon => { icon.className = 'fas fa-sort'; });
        th.querySelector('i').className = this.state.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        this.applyFilterAndSearch(genderCol, this.state.fields.some(f => /^u[1-9]$/i.test(f)));
      });
    });

    const exportBtn = document.getElementById('skmExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const F = this.state.fields;
        const rows = this.state.filteredData.map(item => F.map(k => item[k]));
        rows.unshift(F);
        Utils.exportToCSV('Survei_SKM_DPMPTSP', rows);
      });
    }
  }
};
