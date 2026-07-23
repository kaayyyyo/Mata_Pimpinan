/* ==========================================================================
   PORTAL MATA PIMPINAN - Portal Landing Page Controller (index.html)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  PortalApp.init();
});

const PortalApp = {
  init() {
    this.initClockAndGreeting();
    this.loadQuickStats();
  },

  /**
   * Real-Time Clock & Dynamic Greeting
   */
  initClockAndGreeting() {
    const timeEl = document.getElementById('clockTime');
    const dateEl = document.getElementById('clockDate');
    const greetingEl = document.getElementById('portalGreeting');
    if (!timeEl || !dateEl) return;

    function update() {
      const now = new Date();
      const hours = now.getHours();
      
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(now.getMinutes()).padStart(2, '0');
      const sStr = String(now.getSeconds()).padStart(2, '0');
      timeEl.textContent = `${hStr}:${mStr}:${sStr} WITA`;

      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      dateEl.textContent = new Intl.DateTimeFormat('id-ID', options).format(now);

      if (greetingEl) greetingEl.textContent = 'Mata Pimpinan DPMPTSP';
    }

    update();
    setInterval(update, 1000);
  },

  /**
   * Compute real values from live GAS API endpoints dynamically based on actual schema
   */
  async loadQuickStats() {
    this.toggleMetricLoading(true);

    try {
      const [resPBG, resInv, resSKM, resPeg] = await Promise.all([
        API.request('getRetribusiPBG').catch(() => null),
        API.request('getInvestasi').catch(() => null),
        API.request('getSKM').catch(() => null),
        API.request('getPegawai').catch(() => null)
      ]);

      // 1. Retribusi PBG YTD
      if (resPBG && resPBG.success) {
        const list = resPBG.data || [];
        const numCol = SchemaDetector.detectFields(list).find(f => {
          const l = f.toLowerCase();
          return l.includes('nilai') || l.includes('setoran') || l.includes('retribusi');
        });
        if (numCol) {
          const totalVal = list.reduce((sum, item) => sum + (parseFloat(item[numCol]) || 0), 0);
          document.getElementById('qsPBG').textContent = Utils.formatCurrency(totalVal, true);
        } else {
          document.getElementById('qsPBG').textContent = `${list.length} Record`;
        }
      }

      // 2. Realisasi Investasi Target
      if (resInv && resInv.success) {
        const list = resInv.data || [];
        const numCol = SchemaDetector.detectFields(list).find(f => f.toLowerCase().includes('target') || f.toLowerCase().includes('nilai'));
        if (numCol) {
          const totalVal = list.reduce((sum, item) => sum + (parseFloat(item[numCol]) || 0), 0);
          document.getElementById('qsInvestasi').textContent = Utils.formatCurrency(totalVal, true);
        } else {
          document.getElementById('qsInvestasi').textContent = `${list.length} Data`;
        }
      }

      // 3. SKM/IKM Indeks Conversion
      if (resSKM && resSKM.success) {
        const list = resSKM.data || [];
        const total = list.length;
        const F = SchemaDetector.detectFields(list);
        const hasUnsur = F.some(f => /^u[1-9]$/i.test(f));
        if (total > 0 && hasUnsur) {
          let sumTotalAverages = 0;
          list.forEach(item => {
            let sumUnsur = 0, count = 0;
            for (let i = 1; i <= 9; i++) {
              const key = Object.keys(item).find(k => k.toLowerCase() === 'u' + i);
              if (key) { sumUnsur += parseFloat(item[key]) || 0; count++; }
            }
            sumTotalAverages += count > 0 ? (sumUnsur / count) : 0;
          });
          const ikmValue = ((sumTotalAverages / total) * 25).toFixed(1);
          document.getElementById('qsSKM').textContent = `${ikmValue} / 100`;
        } else {
          document.getElementById('qsSKM').textContent = `${total} Responden`;
        }
      }

      // 4. Total Pegawai
      if (resPeg && resPeg.success) {
        const list = resPeg.data || [];
        document.getElementById('qsPegawai').textContent = `${list.length} SDM`;
      }

      this.toggleMetricLoading(false);

    } catch (err) {
      console.error('[PortalApp] Failed to load quick stats:', err);
      this.toggleMetricLoading(false);
    }
  },

  toggleMetricLoading(isLoading) {
    const list = ['qsPBG', 'qsInvestasi', 'qsSKM', 'qsPegawai'];
    list.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isLoading) {
        el.innerHTML = '<span class="skeleton" style="width: 80px; height: 1.5rem; display: inline-block;"></span>';
      }
    });
  }
};
