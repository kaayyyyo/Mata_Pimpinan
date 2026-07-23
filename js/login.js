/* ==========================================================================
   PORTAL MATA PIMPINAN - Clean Demo Local Authentication
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      Utils.showToast('Peringatan', 'Harap lengkapi semua kolom input.', 'warning');
      return;
    }

    // Set Loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memvalidasi...';

    // Strictly local demo authentication check (No API call)
    setTimeout(() => {
      if (username === 'admin' && password === 'pimpinan123') {
        const user = {
          name: 'Administrator Pimpinan',
          role: 'Super Admin',
          avatar: 'assets/logo.svg'
        };
        Store.setUser(user);
        Utils.showToast('Autentikasi Berhasil', `Selamat datang, ${user.name}.`, 'success');
        
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 800);
      } else {
        Utils.showToast('Autentikasi Gagal', 'Username atau Password salah!', 'danger');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }, 400);
  });
});
