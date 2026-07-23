/* ==========================================================================
   PORTAL MATA PIMPINAN - Application Data & UI State Store
   ========================================================================== */

const Store = {
  state: {
    activeModule: 'dispensasi',
    sidebarCollapsed: false,
    currentUser: null,
    listeners: []
  },

  init() {
    const savedSidebar = localStorage.getItem('pimpinan_sidebar_collapsed');
    if (savedSidebar !== null) {
      try { this.state.sidebarCollapsed = JSON.parse(savedSidebar); }
      catch (e) { this.state.sidebarCollapsed = false; }
    }

    const savedUser = localStorage.getItem('pimpinan_user');
    if (savedUser) {
      try { this.state.currentUser = JSON.parse(savedUser); }
      catch (e) { this.state.currentUser = null; }
    }
  },

  subscribe(listener) {
    this.state.listeners.push(listener);
  },

  notify(event, payload) {
    this.state.listeners.forEach(fn => fn(event, payload));
  },

  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    localStorage.setItem('pimpinan_sidebar_collapsed', JSON.stringify(this.state.sidebarCollapsed));
    this.notify('sidebarToggled', this.state.sidebarCollapsed);
  },

  setUser(user) {
    this.state.currentUser = user;
    if (user) {
      localStorage.setItem('pimpinan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pimpinan_user');
    }
    this.notify('userChanged', user);
  },

  logout() {
    this.setUser(null);
    window.location.href = 'login.html';
  }
};

Store.init();
