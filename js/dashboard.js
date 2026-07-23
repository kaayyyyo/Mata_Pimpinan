/* ==========================================================================
   PORTAL MATA PIMPINAN - Reusable Dashboard Shell Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  DashboardApp.init();
});

const DashboardApp = {
  currentModule: 'dispensasi',

  // Map of URL module keys to display info
  moduleTitles: {
    dispensasi: {
      title: 'Dashboard Dispensasi Pegawai',
      subtitle: 'Monitoring permohonan dinas luar, cuti, sakit, dan izin pegawai'
    },
    pbg: {
      title: 'Dashboard Retribusi PBG',
      subtitle: 'Monitoring realisasi penerimaan retribusi persetujuan bangunan gedung'
    },
    pegawai: {
      title: 'Dashboard Data Pegawai',
      subtitle: 'Direktori dan sebaran statistik Aparatur Sipil Negara (ASN) & Staf'
    },
    rapat: {
      title: 'Dashboard Ringkasan Rapat',
      subtitle: 'Monitoring notulen, keputusan, dan matriks tindak lanjut rapat pimpinan'
    },
    skm: {
      title: 'Dashboard Monitoring SKM',
      subtitle: 'Indeks Kepuasan Masyarakat (IKM) sesuai standar PermenPAN-RB'
    },
    investasi: {
      title: 'Dashboard Investasi',
      subtitle: 'Target, realisasi, dan historis tahunan investasi'
    }
  },

  // Map of module key to API action string
  moduleActions: {
    dispensasi: 'getDispensasi',
    pbg: 'getRetribusi',
    pegawai: 'getPegawai',
    rapat: 'getRapat',
    skm: 'getSKM',
    investasi: 'getInvestasi'
  },

  async init() {
    this.checkAuth();
    this.parseURLParams();
    this.updateSidebarUI();
    this.bindEvents();
    await this.loadModuleData();
  },

  checkAuth() {
    const user = Store.state.currentUser;
    const nameEl = document.getElementById('userNameDisplay');
    if (user && nameEl) {
      nameEl.textContent = user.name;
    }
  },

  parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    if (mod && this.moduleTitles[mod]) {
      this.currentModule = mod;
    }
  },

  updateSidebarUI() {
    document.querySelectorAll('.dashboard-sidebar .menu-item').forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href && href.includes(`module=${this.currentModule}`)) {
        item.classList.add('active');
      }
    });

    const info = this.moduleTitles[this.currentModule];
    if (info) {
      const titleEl = document.getElementById('moduleTitle') || document.getElementById('pageTitle');
      const subEl = document.getElementById('moduleSubtitle') || document.getElementById('pageSub');
      if (titleEl) titleEl.textContent = info.title;
      if (subEl) subEl.textContent = info.subtitle;
    }
  },

  bindEvents() {
    const sidebarToggle = document.getElementById('sidebarToggle') || document.getElementById('toggleSidebar');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        Store.toggleSidebar();
        document.querySelector('.dashboard-layout')
          .classList.toggle('sidebar-collapsed', Store.state.sidebarCollapsed);
      });
    }

    const refreshBtn = document.getElementById('btnRefreshData');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        Utils.showToast('Memuat Ulang...', 'Mengambil data terbaru dari Google Sheets API', 'info');
        this.loadModuleData();
      });
    }

    const printBtn = document.getElementById('btnPrintReport');
    if (printBtn) {
      printBtn.addEventListener('click', () => Utils.printPage());
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'portal_data_changed') this.loadModuleData();
    });

    window.addEventListener('focus', () => this.loadModuleData());
  },

  showLoading(container) {
    container.innerHTML = `
      <div class="card-panel" style="padding: 4rem; text-align: center;">
        <i class="fas fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
        <div style="margin-top: 1rem; font-weight: 600; color: var(--text-muted);">Memuat Data Live Google Sheets...</div>
      </div>
    `;
  },

  showError(container, err) {
    const msg = err && err.message ? err.message : 'Terjadi kesalahan tidak diketahui';
    container.innerHTML = `
      <div class="card-panel" style="padding: 3rem; text-align: center;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i>
        <div style="margin-top: 1rem; font-weight: 700; font-size: 1.2rem; color: var(--text-main);">Koneksi API Gagal</div>
        <div style="color: var(--text-light); margin-top: 0.5rem; max-width: 500px; margin-left: auto; margin-right: auto;">
          ${msg}
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
          Pastikan endpoint Google Apps Script terkonfigurasi dan dapat diakses.
        </div>
        <button class="btn btn-primary btn-sm" onclick="DashboardApp.loadModuleData()" style="margin-top: 1.5rem;">
          <i class="fas fa-redo"></i> Coba Lagi
        </button>
      </div>
    `;
  },

  showEmpty(container) {
    container.innerHTML = `
      <div class="card-panel" style="padding: 4rem; text-align: center;">
        <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--text-muted);"></i>
        <div style="margin-top: 1rem; font-weight: 700; font-size: 1.2rem; color: var(--text-main);">Spreadsheet Kosong</div>
        <div style="color: var(--text-light); margin-top: 0.5rem;">
          Tidak ada data yang ditemukan dalam spreadsheet Google Sheets.
        </div>
      </div>
    `;
  },

  async loadModuleData() {
    const container = document.getElementById('dashboardContent') || document.getElementById('moduleContainer');
    if (!container) return;

    const action = this.moduleActions[this.currentModule];
    if (!action) {
      this.showError(container, new Error(`Module "${this.currentModule}" tidak dikenal.`));
      return;
    }

    this.showLoading(container);

    let res;
    try {
      const params = this.currentModule === 'investasi'
        ? { sheet: InvestasiModule.state.activeTab || 'target' }
        : {};
      res = await API.request(action, params);
    } catch (err) {
      console.error(`[DashboardApp] API request failed for action "${action}":`, err);
      this.showError(container, err);
      return;
    }

    if (!res || !res.success) {
      const apiErr = new Error((res && res.message) || 'Respon API tidak valid atau kosong.');
      console.error('[DashboardApp] Invalid API response:', apiErr.message);
      this.showError(container, apiErr);
      return;
    }

    const rawList = Array.isArray(res.data) ? res.data : [];

    if (rawList.length === 0) {
      if (this.currentModule === 'investasi') {
        this.populateDynamicYearFilter([]);
        await InvestasiModule.render(container, [], InvestasiModule.state.activeTab || 'target');
        return;
      }
      this.showEmpty(container);
      this.populateDynamicYearFilter([]);
      return;
    }

    this.populateDynamicYearFilter(rawList);

    try {
      switch (this.currentModule) {
        case 'dispensasi': await DispensasiModule.render(container, rawList); break;
        case 'pbg':        await PBGModule.render(container, rawList); break;
        case 'pegawai':    await PegawaiModule.render(container, rawList); break;
        case 'rapat':      await RapatModule.render(container, rawList); break;
        case 'skm':        await SKMModule.render(container, rawList); break;
        case 'investasi':  await InvestasiModule.render(container, rawList, InvestasiModule.state.activeTab || 'target'); break;
      }
    } catch (renderErr) {
      console.error(`[DashboardApp] Module render error for "${this.currentModule}":`, renderErr);
      this.showError(container, new Error(`Gagal merender module: ${renderErr.message}`));
    }
  },

  populateDynamicYearFilter(rawList) {
    const filterYear = document.getElementById('filterYear');
    if (!filterYear || !Array.isArray(rawList) || rawList.length === 0) return;

    const years = new Set();
    rawList.forEach(item => {
      if (item.Tahun || item.tahun) years.add(String(item.Tahun || item.tahun));
      const dateStr = item.Tanggal || item.tanggal || item.Timestamp || item.timestamp;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) years.add(String(d.getFullYear()));
      }
    });

    if (years.size > 0) {
      const yearArray = Array.from(years).sort().reverse();
      filterYear.innerHTML = `<option value="Semua">Semua Tahun</option>` +
        yearArray.map(y => `<option value="${y}">${y}</option>`).join('');
    }
  }
};
