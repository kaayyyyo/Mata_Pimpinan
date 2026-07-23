/* ==========================================================================
   PORTAL MATA PIMPINAN - Utility Functions & Schema-Driven Field Mapper
   --------------------------------------------------------------------------
   Every FIELD_MAP entry is derived ONLY from verified live API responses.
   Do NOT add fields that do not exist in the actual spreadsheet.
   ========================================================================== */

/**
 * SchemaDetector: Auto-detects fields from the first row of raw API data.
 * This is the single source of truth — no assumptions.
 */
const SchemaDetector = {
  detectFields(rawList) {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return Object.keys(rawList[0]);
  },

  hasField(rawList, fieldName) {
    if (!Array.isArray(rawList) || rawList.length === 0) return false;
    return rawList[0].hasOwnProperty(fieldName);
  },

  getValue(row, fieldName, fallback = null) {
    if (!row || !row.hasOwnProperty(fieldName)) return fallback;
    const val = row[fieldName];
    if (val === undefined || val === null || val === '') return fallback;
    return val;
  }
};

const FieldMapper = {
  getPresentFields(rawList) {
    return SchemaDetector.detectFields(rawList);
  },

  normalizeList(moduleKey, rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((row, index) => {
      const normalized = { ...row };
      if (!normalized.no && !normalized.No) {
        normalized.no = index + 1;
      } else {
        normalized.no = normalized.no || normalized.No;
      }
      return normalized;
    });
  }
};

const Utils = {
  formatCurrency(amount, compact = false) {
    const val = parseFloat(amount);
    if (isNaN(val)) return 'Rp 0';
    if (compact) {
      if (Math.abs(val) >= 1e12) return `Rp ${(val / 1e12).toFixed(2)} T`;
      if (Math.abs(val) >= 1e9)  return `Rp ${(val / 1e9).toFixed(2)} M`;
      if (Math.abs(val) >= 1e6)  return `Rp ${(val / 1e6).toFixed(1)} Jt`;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(val);
  },

  formatNumber(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  },

  formatDate(dateStr, withTime = false) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    if (withTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  },

  getStatusBadge(status) {
    if (status === undefined || status === null) return '-';
    const s = String(status).toLowerCase();
    if (s.includes('setuju') || s.includes('selesai') || s.includes('tercapai') || s.includes('pns') || s.includes('aktif') || s.includes('lunas')) {
      return `<span class="badge badge-success"><span class="badge-dot"></span> ${status}</span>`;
    }
    if (s.includes('proses') || s.includes('pending') || s.includes('pppk') || s.includes('sebagian') || s.includes('cicilan')) {
      return `<span class="badge badge-warning"><span class="badge-dot"></span> ${status}</span>`;
    }
    if (s.includes('tolak') || s.includes('batal') || s.includes('nonaktif') || s.includes('belum')) {
      return `<span class="badge badge-danger"><span class="badge-dot"></span> ${status}</span>`;
    }
    return `<span class="badge badge-info"><span class="badge-dot"></span> ${status}</span>`;
  },

  showToast(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    if (type === 'danger') iconClass = 'fa-times-circle';
    toast.innerHTML = `
      <i class="fas ${iconClass} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  exportToCSV(filename, rows) {
    if (!rows || !rows.length) {
      Utils.showToast('Peringatan', 'Tidak ada data untuk diexport', 'warning');
      return;
    }
    const processRow = (row) => {
      return row.map(cell => {
        let val = cell === null || cell === undefined ? '' : String(cell);
        val = val.replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) val = '"' + val + '"';
        return val;
      }).join(',') + '\n';
    };
    let csv = '';
    rows.forEach(row => { csv += processRow(row); });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Utils.showToast('Export Berhasil', `File ${filename}.csv berhasil diunduh`, 'success');
  },

  printPage() {
    window.print();
  }
};
