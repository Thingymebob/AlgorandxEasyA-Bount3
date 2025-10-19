async function loadTopBar() {
  const placeholder = document.getElementById('topbar-placeholder');
  if (!placeholder) return;
  
  // Try multiple locations for TopBar.html
  const candidates = ['TopBar.html', 'Pages/TopBar.html', '../Pages/TopBar.html'];
  
  for (const path of candidates) {
    try {
      const url = new URL(path, location.href).href;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const html = await res.text();
      placeholder.outerHTML = html;
      return;
    } catch (_) {
      // try next
    }
  }
  
  console.error('Failed to load TopBar.html from any location');
  placeholder.outerHTML = '<div class="TopBar"><p style="color:red;">TopBar failed to load</p></div>';
}

window.addEventListener('DOMContentLoaded', loadTopBar);
