// parseCardText.ts
// Utility to parse simple campaign card text files of the form:
// TITLE: My Campaign
// ORGANISATION: Example Org
// SHORT_DESCRIPTION: One-line summary
// LONG_DESCRIPTION: Longer explanation
// LOGO: logo.jpg
// DATATYPES: [JPG - "photo", PNG - "screenshot"]

export interface Campaign {
  title: string
  organisation?: string
  shortDescription?: string
  longDescription?: string
  algoPaid?: string
  maxSubmissions?: string
  logo?: string
  datatypes?: Array<{ type: string; desc: string }>
  // Optional IPFS content identifier when campaigns are sourced from on-chain logs
  cid?: string
}

export function parseCardText(txt: string): Campaign {
  const lines = txt.split(/\r?\n/).filter(Boolean)
  const info: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+):\s*(.*)$/i)
    if (m) info[m[1].toUpperCase()] = m[2]
  }

  const datatypesRaw = info['DATATYPES'] || ''
  const datatypeMatches = datatypesRaw.match(/([A-Z]+)\s*-\s*"([^"]*)"/gi) || []
  const parsedTypes = datatypeMatches
    .map((m) => {
      const parts = m.match(/([A-Z]+)\s*-\s*"([^"]*)"/i)
      return parts ? { type: parts[1].toUpperCase(), desc: parts[2] } : null
    })
    .filter(Boolean) as Array<{ type: string; desc: string }>

  // Resolve logo path: if LOGO is provided as a filename (e.g. "Cow.jpg")
  // assume it lives in /Immages/ (public/Immages). If it already looks
  // like an absolute path or URL, use it as-is. If missing, fall back to
  // a default in the images folder.
  let logoRaw = info['LOGO'] || ''
  let logoPath = '/Immages/logo.png' // default placeholder in images folder
  if (logoRaw) {
    if (logoRaw.startsWith('/') || logoRaw.startsWith('http')) {
      logoPath = logoRaw
    } else {
      // treat as filename
      logoPath = `/Immages/${logoRaw}`
    }
  }

  return {
    title: info['TITLE'] || 'Untitled',
    organisation: info['ORGANISATION'],
    shortDescription: info['SHORT_DESCRIPTION'],
    longDescription: info['LONG_DESCRIPTION'],
    algoPaid: info['ALGO_PAID_PER_SUBMISSION'],
    maxSubmissions: info['MAX_SUBMISSIONS'],
    logo: logoPath,
    datatypes: parsedTypes,
  }
}
