async function discoverCardsBase(folderName) {
  const candidates = [`../${folderName}/`];
  const tried = [];
  for (const rel of candidates) {
    const dirUrl = new URL(rel, location.href).href;
    tried.push(dirUrl);
    try {
      const res = await fetch(dirUrl, { cache: 'no-store' });
      if (!res.ok) continue;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a'));
      const files = anchors
        .map((a) => a.getAttribute('href') || '')
        .filter((href) => href.toLowerCase().endsWith('.txt'))
        .map((href) => href.split('/').pop());
      const unique = Array.from(new Set(files));
      if (unique.length) return { base: dirUrl, files: unique };
    } catch (_) {
      // ignore and try next
    }
  }
  throw new Error(`No accessible '${folderName}' directory. Attempted: ${tried.join(', ')}`);
}

async function loadCards() {
  const grid = document.querySelector('.OptionsGrid');
  if (!grid) return;
  // Read folder name from data attribute, default to 'cards'
  const folderName = grid.getAttribute('data-cards-folder') || 'cards';
  
  try {
    const { base, files } = await discoverCardsBase(folderName);
    if (!files.length) throw new Error(`No cards found in '${folderName}'`);
    for (const file of files) {
      const fileUrl = new URL(file, base).href;
      const resp = await fetch(fileUrl, { cache: 'no-store' });
      if (!resp.ok) {
        console.warn(`Failed to fetch card ${file} at ${fileUrl}`);
        continue;
      }
      const txt = await resp.text();
      // Parse first 3 lines: TITLE, ORGANISATION, SHORT_DESCRIPTION
      const lines = txt.split(/\r?\n/);
      const title = (lines[0] || '').replace(/^TITLE:\s*/i, '').trim();
      const org = (lines[1] || '').replace(/^ORGANISATION:\s*/i, '').trim();
      const desc = (lines[2] || '').replace(/^SHORT_DESCRIPTION:\s*/i, '').trim();
      // Use a default image for now (could parse LOGO if needed)
      const imgSrc = '../Immages/Background.jpg';
      // Build viewer link with title in query string; fallback to filename sans extension
      const fallbackTitle = (file || '').replace(/\.[^.]+$/, '');
      const cleanTitle = (title && title.trim()) || fallbackTitle;
      const href = `CampaingViewer.html?title=${encodeURIComponent(cleanTitle)}`;
      // Build HTML card
      const cardHtml = `
        <a class="OptionCard" href="${href}">
          <img class="OptionImage" src="${imgSrc}" alt="${title}" />
          <div class="OptionInfoTop">
            <h2 class="OptionCard">${title}</h2>
          </div>
          <div class="OptionInfoBottom">
            <h4 class="OptionCard">${org}</h4>
            <p class="OptionCard">${desc}</p>
          </div>
        </a>
      `;
      const tpl = document.createElement('template');
      tpl.innerHTML = cardHtml.trim();
      const node = tpl.content.firstElementChild;
      if (node) grid.appendChild(node);
    }
  } catch (err) {
    console.error(err);
    const errEl = document.createElement('div');
    errEl.style.color = 'red';
    errEl.textContent = `No cards could be loaded from '${folderName}'. Serve over HTTP and ensure the folder is accessible (directory listing enabled).`;
    grid?.appendChild(errEl);
  }
}

window.addEventListener('DOMContentLoaded', loadCards);
