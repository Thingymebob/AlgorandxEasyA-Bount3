// Manage tile creation and data type selection for campaign creation

const dataTypes = [
  { value: 'jpg', label: 'JPG Image', icon: '🖼️' },
  { value: 'png', label: 'PNG Image', icon: '🖼️' },
  { value: 'gif', label: 'GIF Image', icon: '🎞️' },
  { value: 'mp4', label: 'MP4 Video', icon: '🎥' },
  { value: 'mov', label: 'MOV Video', icon: '🎥' },
  { value: 'avi', label: 'AVI Video', icon: '🎥' },
  { value: 'mp3', label: 'MP3 Audio', icon: '🎵' },
  { value: 'wav', label: 'WAV Audio', icon: '🎵' },
  { value: 'txt', label: 'Text File', icon: '📄' },
  { value: 'pdf', label: 'PDF Document', icon: '📕' },
  { value: 'doc', label: 'Word Document', icon: '📘' },
  { value: 'csv', label: 'CSV Spreadsheet', icon: '📊' },
  { value: 'json', label: 'JSON Data', icon: '{ }' },
  { value: 'xml', label: 'XML Data', icon: '< >' }
];

let tileCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
  const tilesGrid = document.querySelector('.TilesGrid');
  const addTileButton = document.querySelector('.AddTileButton');
  const form = document.querySelector('.CreateCampaignForm');

  // Add new tile when button is clicked
  addTileButton.addEventListener('click', () => {
    createTile();
  });

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Collect all selected data types
    const tiles = document.querySelectorAll('.DataTile');
    const selectedDataTypes = [];
    
    tiles.forEach((tile, index) => {
      const select = tile.querySelector('.DataTypeSelect');
      if (select.value) {
        const expected = tile.querySelector('.TileExpected')?.value || '';
        selectedDataTypes.push({
          tileNumber: index + 1,
          dataType: select.value,
          label: dataTypes.find(dt => dt.value === select.value)?.label,
          expected: expected.trim()
        });
      }
    });

    console.log('Campaign Data Types:', selectedDataTypes);
    console.log('Selected data types:', selectedDataTypes.map(dt => dt.dataType));

    // Build HTML that mimics cards/Birds.html but populated with this campaign's data
    const campaignTitle = document.querySelector('#campaign-title')?.value || 'Untitled Campaign';
    const organisation = document.querySelector('#organisation')?.value || '';
    const shortDesc = document.querySelector('#short-desc')?.value || '';
    const logoInput = document.querySelector('#logo');
    const ALGOInput = document.querySelector('#algo-paid')?.value || '';
    const MaxSubmissionsInput = document.querySelector('#MaxSubmissions')?.value || '';
    const logoFileName = logoInput && logoInput.files && logoInput.files[0] ? logoInput.files[0].name : (logoInput?.value || 'default.jpg');

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Optional: include tiles info as an HTML comment for metadata
    const tilesComment = selectedDataTypes.length > 0 ? ('<!-- Tiles:\n' + selectedDataTypes.map(t => `  - ${t.tileNumber}: ${t.label} (${t.dataType}) ${t.expected ? '- Expected: ' + t.expected : ''}`).join('\n') + '\n-->') : '';

    const generatedHtml = ` <a class="OptionCard" href="#">\n  <img class="OptionImage" src="../Immages/${escapeHtml(logoFileName)}" alt="${escapeHtml(campaignTitle)}" />\n  <div class="OptionInfoTop">\n    <h2 class="OptionCard">${escapeHtml(campaignTitle)}</h2>\n  </div>\n  <div class="OptionInfoBottom">\n    <h4 class="OptionCard">${escapeHtml(organisation)}</h4>\n    <p class="OptionCard">${escapeHtml(shortDesc)}</p>\n  </div>\n</a>\n${tilesComment}`;

    console.log('Generated HTML file content:\n', generatedHtml);

    // ---- Generate plain text export (one entry per line) ----
    const longDesc = document.querySelector('#long-desc')?.value || '';

    const normalize = (s) => String(s).replace(/\r?\n+/g, ' ').trim();
    const toUpper = (s) => String(s).toUpperCase();

    const lines = [];
    lines.push(`TITLE: ${normalize(campaignTitle)}`);
    lines.push(`ORGANISATION: ${normalize(organisation)}`);
    lines.push(`SHORT_DESCRIPTION: ${normalize(shortDesc)}`);
    if (longDesc) lines.push(`LONG_DESCRIPTION: ${normalize(longDesc)}`);
    lines.push(`ALGO_PAID_PER_SUBMISSION: ${normalize(ALGOInput)}`);
    lines.push(`MAX_SUBMISSIONS: ${normalize(MaxSubmissionsInput)}`);
    if (logoFileName) lines.push(`LOGO: ${normalize(logoFileName)}`);

    // Build DATATYPES line as a list
    const datatypesList = selectedDataTypes.map(t => {
      const typeText = toUpper(t.dataType);
      const expected = t.expected ? `\"${normalize(t.expected)}\"` : '""';
      return `${typeText} - ${expected}`;
    }).join(' , ');
    lines.push(`DATATYPES: [${datatypesList}]`);

    const textExport = lines.join('\n');
    console.log('Generated TXT export (one entry per line):\n' + textExport);

    try {
      const blob = new Blob([textExport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaignTitle}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to trigger TXT download:', err);
    }

    // You can add form submission logic here (e.g., send the generatedHtml to a server)
  });

  function createTile() {
    tileCounter++;
    
    const tile = document.createElement('div');
    tile.className = 'DataTile OptionCard';
    tile.innerHTML = `
        <div class="TileHeader">
        <span class="TileNumber">Tile ${tileCounter}</span>
        <button type="button" class="RemoveTileBtn" title="Remove tile">×</button>
        </div>
        <div class="TileContent">
        <label for="datatype-${tileCounter}">Data Type:</label>
        <select id="datatype-${tileCounter}" class="DataTypeSelect" required>
            <option value="">-- Select Type --</option>
            ${dataTypes.map(dt => `
            <option value="${dt.value}">${dt.icon} ${dt.label}</option>
            `).join('')}
        </select>

        <label for="expected-${tileCounter}">Expected (short)</label>
        <textarea
            id="expected-${tileCounter}"
            class="TileExpected"
            rows="2"
            placeholder="e.g. a clear image of a wild bird you took this week in your local area"
        ></textarea>
        </div>
    `;
    
    // Add remove functionality
    const removeBtn = tile.querySelector('.RemoveTileBtn');
    removeBtn.addEventListener('click', () => {
      tile.remove();
      updateTileNumbers();
    });

    // Change title and color to selected data type category when changed
    const select = tile.querySelector('.DataTypeSelect');
    select.addEventListener('change', () => {
      const tiles = Array.from(document.querySelectorAll('.DataTile'));
      const idx = tiles.indexOf(tile);
      updateTileHeader(tile, idx);
      applyCategoryClass(tile, select.value);
    });
    
    tilesGrid.appendChild(tile);

    // Initialize header for the new tile
    const tiles = Array.from(document.querySelectorAll('.DataTile'));
    const idx = tiles.indexOf(tile);
    updateTileHeader(tile, idx);
    applyCategoryClass(tile, '');
  }

  function updateTileNumbers() {
    const tiles = document.querySelectorAll('.DataTile');
    tiles.forEach((tile, index) => {
      updateTileHeader(tile, index);
    });
  }

  function getDataTypeLabel(value) {
    return dataTypes.find(dt => dt.value === value)?.label ?? '';
  }

  function updateTileHeader(tile, index) {
    const headerEl = tile.querySelector('.TileNumber');
    const select = tile.querySelector('.DataTypeSelect');
    const label = getDataTypeLabel(select.value);
    headerEl.textContent = label && label.trim().length > 0 ? label : `Tile ${index + 1}`;
  }

  // Map file extensions to categories
  const categoryMap = {
    image: ['jpg', 'png', 'gif'],
    video: ['mp4', 'mov', 'avi'],
    audio: ['mp3', 'wav'],
    doc: ['txt', 'pdf', 'doc', 'csv'],
    data: ['json', 'xml']
  };

  function getCategoryForValue(value) {
    if (!value) return '';
    for (const [cat, list] of Object.entries(categoryMap)) {
      if (list.includes(value)) return cat;
    }
    return '';
  }

  function applyCategoryClass(tile, value) {
    // remove existing type- classes
    tile.classList.remove('type-image', 'type-video', 'type-audio', 'type-doc', 'type-data');
    const category = getCategoryForValue(value);
    if (category) {
      tile.classList.add(`type-${category}`);
    }
  }
});
