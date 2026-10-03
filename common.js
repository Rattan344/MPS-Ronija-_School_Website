// Simple session guard for admin pages (client-side only)
function requireAuth(){if(sessionStorage.getItem('mps-auth')!=='1')location.replace('login.html')}
function logout(){sessionStorage.removeItem('mps-auth');location.href='index.html'}