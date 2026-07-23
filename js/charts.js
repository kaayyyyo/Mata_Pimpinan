/* ==========================================================================
   PORTAL MATA PIMPINAN - Enterprise Chart.js Generator Engine
   ========================================================================== */

const ChartEngine = {
  instances: {},

  // DPMPTSP Palette Colors
  colors: {
    primary: '#0F4C81',
    secondary: '#2563EB',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#0284C7',
    purple: '#8B5CF6',
    gray: '#64748B',
    palette: ['#0F4C81', '#2563EB', '#16A34A', '#F59E0B', '#8B5CF6', '#0284C7', '#DC2626']
  },

  /**
   * Destroy chart instance before re-rendering
   */
  destroy(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  },

  /**
   * Smooth Line Trend Chart Generator
   */
  createLineChart(canvasId, labels, datasets) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets.map((ds, index) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.borderColor || this.colors.palette[index % this.colors.palette.length],
          backgroundColor: ds.backgroundColor || 'transparent',
          borderWidth: 3,
          tension: 0.35,
          fill: !!ds.backgroundColor,
          pointRadius: 4,
          pointHoverRadius: 7
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: '#E2E8F0', strokeDashArray: [4, 4] },
            ticks: { font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
    return this.instances[canvasId];
  },

  /**
   * Executive Bar Chart Generator
   */
  createBarChart(canvasId, labels, datasets, stacked = false) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets.map((ds, index) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor || this.colors.palette[index % this.colors.palette.length],
          borderRadius: 6,
          borderSkipped: false
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true }
          },
          tooltip: { padding: 12, cornerRadius: 8 }
        },
        scales: {
          x: {
            stacked: stacked,
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          y: {
            stacked: stacked,
            grid: { color: '#E2E8F0' },
            ticks: { font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
    return this.instances[canvasId];
  },

  /**
   * Donut / Doughnut Composition Chart Generator
   */
  createDonutChart(canvasId, labels, dataValues, customColors = null) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const bgColors = customColors || this.colors.palette.slice(0, labels.length);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 16 }
          },
          tooltip: { padding: 12, cornerRadius: 8 }
        },
        cutout: '70%'
      }
    });
    return this.instances[canvasId];
  },

  /**
   * Radar Chart Generator for SKM 9 Unsur Pelayanan
   */
  createRadarChart(canvasId, labels, dataValues, datasetLabel = 'Nilai Unsur') {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: datasetLabel,
          data: dataValues,
          backgroundColor: 'rgba(15, 76, 129, 0.25)',
          borderColor: this.colors.primary,
          borderWidth: 2,
          pointBackgroundColor: this.colors.secondary,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { padding: 10, cornerRadius: 8 }
        },
        scales: {
          r: {
            angleLines: { color: '#E2E8F0' },
            grid: { color: '#E2E8F0' },
            pointLabels: { font: { family: 'Inter', size: 10 } },
            suggestedMin: 0,
            suggestedMax: 4
          }
        }
      }
    });
    return this.instances[canvasId];
  }
};
