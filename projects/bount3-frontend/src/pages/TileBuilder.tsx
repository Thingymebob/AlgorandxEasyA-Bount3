import { useMemo, useState } from 'react'

type DataType = { value: string; label: string; icon: string }

const dataTypes: DataType[] = [
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
  { value: 'xml', label: 'XML Data', icon: '< >' },
]

function getLabel(value: string) {
  return dataTypes.find((d) => d.value === value)?.label ?? ''
}

const categoryMap: Record<string, string[]> = {
  image: ['jpg', 'png', 'gif'],
  video: ['mp4', 'mov', 'avi'],
  audio: ['mp3', 'wav'],
  doc: ['txt', 'pdf', 'doc', 'csv'],
  data: ['json', 'xml'],
}

function getCategory(value: string) {
  if (!value) return ''
  for (const [cat, list] of Object.entries(categoryMap)) {
    if (list.includes(value)) return cat
  }
  return ''
}

type Tile = { id: number; type: string; expected: string }

export default function TileBuilder() {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [counter, setCounter] = useState(0)

  const addTile = () => {
    setTiles((prev) => [...prev, { id: counter + 1, type: '', expected: '' }])
    setCounter((c) => c + 1)
  }

  const removeTile = (id: number) => {
    setTiles((prev) => prev.filter((t) => t.id !== id))
  }

  const updateType = (id: number, value: string) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, type: value } : t)))
  }

  const updateExpected = (id: number, value: string) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, expected: value } : t)))
  }

  const datatypesLine = useMemo(() => {
    const toUpper = (s: string) => String(s).toUpperCase()
    const normalize = (s: string) =>
      String(s)
        .replace(/\r?\n+/g, ' ')
        .trim()
    return (
      'DATATYPES: [' +
      tiles
        .filter((t) => t.type)
        .map((t) => `${toUpper(t.type)} - "${normalize(t.expected) || ''}"`)
        .join(' , ') +
      ']'
    )
  }, [tiles])

  const htmlCardSnippet = useMemo(() => {
    // Minimal HTML snippet similar to the legacy script
    const escapeHtml = (str: string) =>
      String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

    const title = 'Untitled Campaign'
    const organisation = ''
    const logoFileName = 'Create.jpg'
    const shortDesc = 'Short description here'
    return ` <a class="OptionCard" href="#">\n  <img class="OptionImage" src="/Immages/${escapeHtml(
      logoFileName,
    )}" alt="${escapeHtml(title)}" />\n  <div class="OptionInfoTop">\n    <h2 class="OptionCard">${escapeHtml(title)}</h2>\n  </div>\n  <div class="OptionInfoBottom">\n    <h4 class="OptionCard">${escapeHtml(organisation)}</h4>\n    <p class="OptionCard">${escapeHtml(shortDesc)}</p>\n  </div>\n</a>`
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard')
    } catch (e) {
      console.error('Clipboard write failed', e)
    }
  }

  return (
    <section className="CreateCampaignLayout">
      <div className="FormSection">
        <h1>Legacy Tile Builder (separate)</h1>
        <p style={{ marginTop: 0, marginBottom: '1em', color: 'rgba(255,255,255,0.85)' }}>
          This is a standalone re-implementation of the original tile system. It does not change your current Create Campaign form.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="TopBarButton" type="button" onClick={addTile}>
            + Add tile
          </button>
          <button className="TopBarButton" type="button" onClick={() => setTiles([])} style={{ background: 'rgba(255,77,0,0.8)' }}>
            Clear
          </button>
        </div>

        <div className="TilesGrid" style={{ marginTop: '0.5em' }}>
          {tiles.map((t, idx) => {
            const label = getLabel(t.type)
            const category = getCategory(t.type)
            const classes = `DataTile OptionCard ${category ? `type-${category}` : ''}`
            return (
              <div key={t.id} className={classes}>
                <div className="TileHeader">
                  <span className="TileNumber">{label && label.trim().length > 0 ? label : `Tile ${idx + 1}`}</span>
                  <button className="RemoveTileBtn" type="button" title="Remove tile" onClick={() => removeTile(t.id)}>
                    ×
                  </button>
                </div>
                <div className="TileContent">
                  <label>Data Type:</label>
                  <select className="DataTypeSelect" value={t.type} onChange={(e) => updateType(t.id, e.target.value)} required>
                    <option value="">-- Select Type --</option>
                    {dataTypes.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.icon} {dt.label}
                      </option>
                    ))}
                  </select>
                  <label>Expected (short)</label>
                  <textarea
                    className="TileExpected"
                    rows={2}
                    placeholder="e.g. a clear image of a wild bird you took this week in your local area"
                    value={t.expected}
                    onChange={(e) => updateExpected(t.id, e.target.value)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: 0 }}>Exports</h3>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
              {datatypesLine}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="TopBarButton" type="button" onClick={() => copyToClipboard(datatypesLine)}>
                Copy TXT line
              </button>
              <button className="TopBarButton" type="button" onClick={() => copyToClipboard(htmlCardSnippet)}>
                Copy HTML card snippet
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
