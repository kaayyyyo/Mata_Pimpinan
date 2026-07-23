/* ==========================================================================
   PORTAL MATA PIMPINAN - Executive Admin Controller (Dynamic Schema & Robust CRUD)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});

const AdminApp = {
  currentTab: 'pegawai',
  currentData: [],
  presentKeys: [],
  selectedIndex: -1,

  colHeadings: {
    No: 'No',
    no: 'No',
    Tahun: 'Tahun',
    Target_Renstra: 'Target Renstra (Rp)',
    Target_Provinsi: 'Target Provinsi (Rp)',
    'Nama Pegawai': 'Nama Pegawai',
    NIP: 'NIP',
    'Status Pegawai': 'Status Pegawai',
    'Golongan/Ruang': 'Golongan / Ruang',
    Jabatan: 'Jabatan',
    Bidang: 'Bidang',
    // Retribusi PBG — sesuai kolom spreadsheet asli
    Nama: 'Nama',
    'No. SKRD': 'No. SKRD',
    'Tgl. TERBIT': 'Tgl. Terbit',
    Nominal: 'Nominal (Rp)',
    Denda: 'Denda (Rp)',
    Masa: 'Masa',
    'Tgl. SETORAN': 'Tgl. Setoran',
    'Nominal Setoran': 'Nominal Setoran (Rp)',
    // Backward compatibility aliases
    SKRD: 'Nomor SKRD',
    'Nomor SKRD': 'Nomor SKRD',
    'Nama Pemohon': 'Nama Pemohon',
    'Jenis PBG': 'Jenis PBG',
    Tanggal: 'Tanggal',
    'Nilai Retribusi': 'Nilai Retribusi (Rp)',
    'Status Bayar': 'Status Bayar',
    // Dispensasi
    'Tanggal Mulai': 'Tanggal Mulai',
    'Tanggal Selesai': 'Tanggal Selesai',
    'Jenis Dispensasi': 'Jenis Dispensasi',
    Alasan: 'Alasan',
    // Rapat
    'Judul Rapat': 'Judul Rapat',
    'Pimpinan Rapat': 'Pimpinan Rapat',
    'Hasil Keputusan': 'Hasil Keputusan (Notulen)',
    Status: 'Status',
    // SKM
    Responden: 'Nama Responden',
    'Nama Responden': 'Nama Responden',
    Pendidikan: 'Pendidikan',
    Pekerjaan: 'Pekerjaan',
    Usia: 'Usia',
    'Jenis Kelamin': 'Jenis Kelamin'
  },

  async init() {
    this.checkAuth();
    this.bindEvents();
    await this.loadTabData();
  },

  checkAuth() {
    const user = Store.state.currentUser;
    const nameEl = document.getElementById('adminName');
    if (nameEl) {
      nameEl.textContent = user ? user.name : 'Administrator';
    }
  },

  getActionName() {
    switch (this.currentTab) {
      case 'pegawai': return 'getPegawai';
      case 'pbg': return 'getRetribusi';
      case 'dispensasi': return 'getDispensasi';
      case 'rapat': return 'getRapat';
      case 'skm': return 'getSKM';
      case 'investasi': return 'getInvestasi';
      default: return 'getPegawai';
    }
  },

  getMutationAction(operation) {
    const names = {
      pbg: 'Retribusi',
      skm: 'SKM',
      pegawai: 'Pegawai',
      dispensasi: 'Dispensasi',
      rapat: 'Rapat',
      investasi: 'Investasi'
    };
    return `${operation}${names[this.currentTab] || 'Pegawai'}`;
  },

  bindEvents() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentTab = item.getAttribute('data-tab');
        this.loadTabData();
      });
    });

    const closeModal = () => {
      const modal = document.getElementById('crudModalOverlay');
      if (modal) modal.classList.remove('active');
      this.selectedIndex = -1;
    };

    const closeBtn = document.getElementById('crudModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const cancelBtn = document.getElementById('crudCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const form = document.getElementById('crudForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveItem();
      });
    }
  },

  async loadTabData() {
    const container = document.getElementById('adminContent');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center justify-center flex-col" style="padding: 4rem; text-align: center;">
        <i class="fas fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
        <div style="margin-top: 1rem; font-weight: 600; color: var(--text-muted);">Memuat Data ${this.currentTab.toUpperCase()}...</div>
      </div>
    `;

    try {
      const action = this.getActionName();
      const res = await API.request(action);
      if (res && res.success) {
        const raw = res.data || [];
        this.presentKeys = SchemaDetector.detectFields(raw);
        if (this.presentKeys.length === 0) {
          this.setDefaultKeysForTab();
        }
        this.currentData = FieldMapper.normalizeList(this.currentTab, raw);
        this.renderTable();
      } else {
        throw new Error((res && res.message) || 'Gagal memuat data.');
      }
    } catch (err) {
      console.error('[AdminApp] Load error:', err);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-triangle-exclamation" style="color: var(--danger);"></i>
          <div class="empty-state-title">Gagal Memuat Data</div>
          <div class="empty-state-text">${err.message || 'Terjadi kesalahan jaringan.'}</div>
          <button class="btn btn-primary btn-sm" onclick="AdminApp.loadTabData()" style="margin-top: 1.25rem;">
            <i class="fas fa-redo"></i> Coba Lagi
          </button>
        </div>
      `;
    }
  },

  setDefaultKeysForTab() {
    switch (this.currentTab) {
      case 'investasi': this.presentKeys = ['Tahun', 'Target_Renstra', 'Target_Provinsi']; break;
      case 'pegawai': this.presentKeys = ['No', 'Nama Pegawai', 'NIP', 'Status Pegawai', 'Golongan/Ruang']; break;
      case 'pbg': this.presentKeys = ['No', 'Nama', 'No. SKRD', 'Tgl. TERBIT', 'Nominal', 'Denda', 'Masa', 'Tgl. SETORAN', 'Nominal Setoran']; break;
      case 'dispensasi': this.presentKeys = ['No', 'Nama Pegawai', 'NIP', 'Jenis Dispensasi', 'Tanggal Mulai', 'Status']; break;
      case 'rapat': this.presentKeys = ['No', 'Judul Rapat', 'Pimpinan Rapat', 'Hasil Keputusan', 'Status', 'Tanggal']; break;
      case 'skm': this.presentKeys = ['No', 'Timestamp', 'Nama Responden', 'Jenis Kelamin', 'Usia', 'Pendidikan', 'Pekerjaan']; break;
    }
  },

  getDefaultKeysForCurrentTab() {
    switch (this.currentTab) {
      case 'investasi': return ['Tahun', 'Target_Renstra', 'Target_Provinsi'];
      case 'pegawai':   return ['No', 'Nama Pegawai', 'NIP', 'Status Pegawai', 'Golongan/Ruang'];
      case 'pbg':       return ['No', 'Nama', 'No. SKRD', 'Tgl. TERBIT', 'Nominal', 'Denda', 'Masa', 'Tgl. SETORAN', 'Nominal Setoran'];
      case 'dispensasi': return ['No', 'Nama Pegawai', 'NIP', 'Jenis Dispensasi', 'Tanggal Mulai', 'Status'];
      case 'rapat':     return ['No', 'Judul Rapat', 'Pimpinan Rapat', 'Hasil Keputusan', 'Status', 'Tanggal'];
      case 'skm':       return ['No', 'Timestamp', 'Nama Responden', 'Jenis Kelamin', 'Usia', 'Pendidikan', 'Pekerjaan'];
      default:          return ['No'];
    }
  },

  renderTable() {
    const container = document.getElementById('adminContent');
    if (!container) return;

    const displayKeys = this.presentKeys.filter(k => k !== '_rowId' && !/^u[1-9]$/i.test(k));
    const headers = displayKeys.map(k => `<th>${(this.colHeadings[k] || k).replace(/_/g, ' ')}</th>`).join('') + `<th style="text-align: right;">Aksi</th>`;

    const rows = this.currentData.map((item, idx) => `
      <tr>
        ${displayKeys.map(k => {
          const val = item[k];
          const lower = k.toLowerCase();
          if (lower === 'no') return `<td><strong>#${idx+1}</strong></td>`;
          if (lower.includes('nama') || lower.includes('judul') || lower.includes('pemohon')) return `<td><div class="font-semibold" style="color: var(--primary);">${val || '-'}</div></td>`;
          if (lower.includes('nip') || lower === 'no. skrd') return `<td><code>${val || '-'}</code></td>`;
          if (lower.includes('tanggal') || lower.includes('tgl') || lower.includes('date')) return `<td>${Utils.formatDate(val)}</td>`;
          if (lower.includes('nominal') || lower.includes('nilai') || lower.includes('target') || lower.includes('denda') || lower.includes('setoran')) return `<td class="font-semibold" style="color: var(--primary);">${Utils.formatCurrency(val)}</td>`;
          if (lower.includes('status')) return `<td>${Utils.getStatusBadge(val)}</td>`;
          return `<td>${val !== null && val !== undefined ? val : ''}</td>`;
        }).join('')}
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-outline btn-sm btn-icon" onclick="AdminApp.openFormModal(${idx})" title="Ubah"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="AdminApp.deleteItem(${idx})" title="Hapus"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="card-panel">
        <div class="card-header">
          <div>
            <div class="card-title"><i class="fas fa-database"></i> Panel Kelola Data ${this.currentTab.toUpperCase()}</div>
            <div class="card-subtitle">Total Record: ${this.currentData.length} Data</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="AdminApp.resetData()"><i class="fas fa-undo"></i> Muat Ulang Data</button>
            <button class="btn btn-primary btn-sm" onclick="AdminApp.openFormModal(-1)"><i class="fas fa-plus"></i> Tambah Data Baru</button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  ${headers}
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="${displayKeys.length + 1}" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada data terdaftar.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openFormModal(idx = -1) {
    const modal = document.getElementById('crudModalOverlay');
    const modalTitle = document.getElementById('crudModalTitle');
    const formFields = document.getElementById('crudFormFields');
    
    if (!modal || !formFields) return;

    this.selectedIndex = idx;
    const selectedItem = idx >= 0 && idx < this.currentData.length ? this.currentData[idx] : null;
    modalTitle.textContent = selectedItem ? `Ubah Data ${this.currentTab.toUpperCase()} (#${idx+1})` : `Tambah Data ${this.currentTab.toUpperCase()} Baru`;

    formFields.innerHTML = this.getDynamicFormHTML(selectedItem);
    modal.classList.add('active');
  },

  getDynamicFormHTML(item = null) {
    const row = item || {};
    const keys = (this.presentKeys.length > 0 ? this.presentKeys : this.getDefaultKeysForCurrentTab())
      .filter(k => k !== '_rowId');

    return keys.filter(k => k.toLowerCase() !== 'no' && !/^u[1-9]$/i.test(k)).map(k => {
      const label = (this.colHeadings[k] || k).replace(/_/g, ' ');
      const val = row[k] !== undefined && row[k] !== null ? row[k] : '';
      const lower = k.toLowerCase();

      if (lower.includes('status')) {
        let options = ['PNS', 'PPPK', 'THL'];
        if (this.currentTab === 'pbg') options = ['Lunas', 'Cicilan', 'Belum Bayar'];
        if (this.currentTab === 'dispensasi') options = ['Disetujui', 'Pending', 'Ditolak'];
        if (this.currentTab === 'rapat') options = ['Selesai', 'Proses', 'Belum'];

        return `
          <div class="form-group">
            <label class="form-label">${label}</label>
            <select class="form-select" name="${k}">
              ${options.map(opt => `<option value="${opt}" ${String(val).toLowerCase() === opt.toLowerCase() ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
        `;
      }

      if (lower.includes('tanggal') || lower.includes('date')) {
        return `
          <div class="form-group">
            <label class="form-label">${label}</label>
            <input type="date" class="form-control" name="${k}" value="${val ? String(val).slice(0,10) : ''}" required>
          </div>
        `;
      }

      if (lower.includes('target') || lower.includes('nilai') || lower.includes('nominal') || lower.includes('denda') || lower.includes('jumlah') || lower === 'tahun') {
        return `
          <div class="form-group">
            <label class="form-label">${label}</label>
            <input type="number" step="any" class="form-control" name="${k}" value="${val}" required placeholder="0">
          </div>
        `;
      }

      if (lower.includes('keputusan') || lower.includes('notulen') || lower.includes('saran') || lower.includes('alasan')) {
        return `
          <div class="form-group">
            <label class="form-label">${label}</label>
            <textarea class="form-control" name="${k}" style="height: 90px;" required>${val}</textarea>
          </div>
        `;
      }

      return `
        <div class="form-group">
          <label class="form-label">${label}</label>
          <input type="text" class="form-control" name="${k}" value="${val}" required placeholder="Masukkan ${label}...">
        </div>
      `;
    }).join('');
  },

  async saveItem() {
    const form = document.getElementById('crudForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const newItem = this.selectedIndex >= 0 ? { ...this.currentData[this.selectedIndex] } : {};

    formData.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.includes('target') || lower.includes('nilai') || lower.includes('nominal') || lower.includes('denda') || lower.includes('jumlah') || lower === 'tahun') {
        newItem[key] = parseFloat(val) || 0;
      } else {
        newItem[key] = val;
      }
    });

    const isUpdate = this.selectedIndex >= 0 && this.selectedIndex < this.currentData.length;
    const saveButton = document.getElementById('crudSaveBtn');
    const originalButton = saveButton ? saveButton.innerHTML : '';
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    }

    try {
      const payload = { data: newItem };
      if (isUpdate) payload.id = this.currentData[this.selectedIndex]._rowId;
      const response = await API.mutate(this.getMutationAction(isUpdate ? 'update' : 'create'), payload);
      if (!response.success) throw new Error(response.message || 'Gagal menyimpan data.');

      const modal = document.getElementById('crudModalOverlay');
      if (modal) modal.classList.remove('active');
      this.selectedIndex = -1;
      this.notifyDataChanged();
      Utils.showToast('Sukses', response.message || 'Data berhasil disimpan ke Google Spreadsheet.', 'success');
      await this.loadTabData();
    } catch (err) {
      console.error('[AdminApp] Save error:', err);
      Utils.showToast('Gagal Menyimpan', err.message || 'Koneksi ke Google Spreadsheet gagal. Data tidak diubah.', 'danger');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = originalButton;
      }
    }
  },

  async deleteItem(idx) {
    if (idx < 0 || idx >= this.currentData.length) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus data #${idx + 1}?`)) return;

    const row = this.currentData[idx];
    if (!row || !row._rowId) {
      Utils.showToast('Gagal Menghapus', 'ID baris tidak tersedia. Muat ulang data lalu coba lagi.', 'danger');
      return;
    }

    try {
      const response = await API.mutate(this.getMutationAction('delete'), { id: row._rowId });
      if (!response.success) throw new Error(response.message || 'Gagal menghapus data.');
      this.notifyDataChanged();
      Utils.showToast('Terhapus', response.message || 'Data berhasil dihapus dari Google Spreadsheet.', 'success');
      await this.loadTabData();
    } catch (err) {
      console.error('[AdminApp] Delete error:', err);
      Utils.showToast('Gagal Menghapus', err.message || 'Koneksi ke Google Spreadsheet gagal. Data tidak diubah.', 'danger');
    }
  },

  notifyDataChanged() {
    localStorage.setItem('portal_data_changed', JSON.stringify({ module: this.currentTab, at: Date.now() }));
  },

  resetData() {
    if (!confirm('Muat ulang data terbaru dari Google Spreadsheet?')) return;
    Utils.showToast('Info', 'Data ditampilkan ulang dari Google Spreadsheet.', 'info');
    this.loadTabData();
  }
};
