import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { Buffer } from 'buffer'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bount3Factory } from '../contracts/Bount3'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

/* VerifyCampaign.tsx
   - Shows pending submissions for a campaign identified by its CID.
   - Uses indexer logs to gather submission_created events for this campaign and
     subtracts those that are verified/declined to compute "pending".
   - Caches results in localStorage with TTLs to speed up reloads.
*/
export default function VerifyCampaign() {
  const { cid } = useParams<{ cid: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<SubmissionView[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [campaignTitle, setCampaignTitle] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null) // submission id currently being actioned
  const { transactionSigner, activeAddress } = useWallet()

  const indexerServer = (import.meta.env.VITE_INDEXER_SERVER as string | undefined) || 'http://127.0.0.1'
  const indexerPort = Number((import.meta.env.VITE_INDEXER_PORT as string | undefined) || 8980)
  const appId = useMemo(() => {
    const raw = import.meta.env.VITE_BOUNT3_APP_ID
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [])
  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000'

  // Cache helpers
  const cacheSecs = Number((import.meta.env.VITE_INDEXER_CACHE_SECONDS as any) ?? '60')
  const metaCacheSecs = Number((import.meta.env.VITE_METADATA_CACHE_SECONDS as any) ?? '300')
  const now = () => Date.now()
  function cacheGet<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const obj = JSON.parse(raw)
      if (!obj || typeof obj !== 'object') return null
      if (typeof obj.expires !== 'number') return null
      if (obj.expires < now()) {
        localStorage.removeItem(key)
        return null
      }
      return obj.data as T
    } catch {
      return null
    }
  }
  function cacheSet<T>(key: string, data: T, ttlSecs: number) {
    try {
      localStorage.setItem(key, JSON.stringify({ data, expires: now() + ttlSecs * 1000 }))
    } catch {}
  }

  function decodeAscii(u8: Uint8Array) {
    return new TextDecoder().decode(u8)
  }

  type SubmissionView = {
    id: string // IPFS submission CID
    meta: any | null
    previewUrl: string | null
    audioSources: Array<{ name?: string; src: string }>
  }

  async function fetchSubmissionMeta(subCid: string): Promise<any | null> {
    const metaCacheKey = `b3:submission:${subCid}:meta`
    const cached = cacheGet<any>(metaCacheKey)
    if (cached) {
      console.log('[VerifyCampaign] Cache hit for submission meta', subCid)
      return cached
    }
    try {
      const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch_metadata/${encodeURIComponent(subCid)}`)
      const data = await resp.json()
      if (!resp.ok || data?.error) return null
      let desc: any = data?.description
      if (typeof desc === 'string') {
        try {
          desc = JSON.parse(desc)
        } catch {}
      }
      const meta = desc ?? data ?? null
      cacheSet(metaCacheKey, meta, metaCacheSecs)
      return meta
    } catch {
      return null
    }
  }

  async function fetchCampaignMeta(campaignCid: string): Promise<any | null> {
    const metaCacheKey = `b3:campaign:${campaignCid}:meta`
    const cached = cacheGet<any>(metaCacheKey)
    if (cached) {
      return cached
    }
    try {
      const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch_metadata/${encodeURIComponent(campaignCid)}`)
      const data = await resp.json()
      if (!resp.ok || data?.error) return null
      let desc: any = data?.description
      if (typeof desc === 'string') {
        try {
          desc = JSON.parse(desc)
        } catch {}
      }
      const meta = desc ?? data ?? null
      cacheSet(metaCacheKey, meta, metaCacheSecs)
      return meta
    } catch {
      return null
    }
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = String(text || '').split(' ')
    let line = ''
    const lines: string[] = []
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim())
        line = words[n] + ' '
      } else {
        line = testLine
      }
    }
    if (line) lines.push(line.trim())
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight))
    return y + lines.length * lineHeight
  }

  async function drawSubmissionPreview(id: string, meta: any): Promise<string | null> {
    try {
      const width = 960
      const pad = 24
      const lh = 22
      const title = `Submission ${id.slice(0, 8)}…`
      const createdAt = meta?.createdAt || ''
      const fields: any[] = Array.isArray(meta?.fields) ? meta.fields : []

      // Compute height estimate
      let height = 160
      let imgToDraw: HTMLImageElement | null = null
      for (const f of fields) {
        const t = String(f?.type || '').toLowerCase()
        if (t === 'text' || t === 'bool' || t === 'boolean' || t === 'audio') height += 80
        if (t === 'image' && f?.file?.dataUrl) height += 300
      }

      const firstImg = fields.find((f) => String(f?.type || '').toLowerCase() === 'image' && f?.file?.dataUrl)
      if (firstImg) {
        try {
          imgToDraw = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = firstImg.file.dataUrl
          })
        } catch {}
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      // Background to white
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      // Header (dark text)
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText(title, pad, pad + 20)
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#555555'
      ctx.fillText(createdAt, pad, pad + 44)

      let y = pad + 80
      const contentWidth = width - pad * 2
      for (const f of fields) {
        const t = String(f?.type || '').toLowerCase()
        const label = String(f?.description || '')
        if (t === 'text') {
          ctx.fillStyle = '#555555'
          y = wrapText(ctx, `${label}:`, pad, y, contentWidth, lh) + 6
          ctx.fillStyle = '#111111'
          y = wrapText(ctx, String(f?.value ?? ''), pad + 12, y, contentWidth - 12, lh) + 12
        } else if (t === 'bool' || t === 'boolean') {
          ctx.fillStyle = '#555555'
          y = wrapText(ctx, `${label}:`, pad, y, contentWidth, lh) + 6
          ctx.fillStyle = '#111111'
          y = wrapText(ctx, String(!!f?.value), pad + 12, y, contentWidth - 12, lh) + 12
        } else if (t === 'audio') {
          ctx.fillStyle = '#555555'
          y = wrapText(ctx, `${label}: (audio below)`, pad, y, contentWidth, lh) + 12
        } else if (t === 'image') {
          ctx.fillStyle = '#555555'
          y = wrapText(ctx, `${label}: (see image)`, pad, y, contentWidth, lh) + 12
        } else {
          ctx.fillStyle = '#555555'
          y = wrapText(ctx, `${label}:`, pad, y, contentWidth, lh) + 6
          ctx.fillStyle = '#111111'
          y = wrapText(ctx, '[file attached]', pad + 12, y, contentWidth - 12, lh) + 12
        }
      }

      if (imgToDraw) {
        const maxW = width - pad * 2
        const scale = Math.min(1, maxW / imgToDraw.naturalWidth)
        const dw = Math.round(imgToDraw.naturalWidth * scale)
        const dh = Math.round(imgToDraw.naturalHeight * scale)
        ctx.drawImage(imgToDraw, pad, y, dw, dh)
        y += dh + 8
      }

      // Watermark tiling
      ctx.save()
      ctx.globalAlpha = 0.08
      ctx.translate(width / 2, height / 2)
      ctx.rotate((-20 * Math.PI) / 180)
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 72px sans-serif'
      const wm = 'Bount3 Pending Review'
      const wmWidth = ctx.measureText(wm).width
      for (let yy = -height; yy < height; yy += 160) {
        for (let xx = -width; xx < width; xx += wmWidth + 80) {
          ctx.fillText(wm, xx, yy)
        }
      }
      ctx.restore()

      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  }

  async function loadPending() {
    if (!appId) {
      setError('Missing or invalid VITE_BOUNT3_APP_ID')
      return
    }
    if (!cid) {
      setError('Missing campaign CID')
      return
    }
    setLoading(true)
    setError(null)
    setPending([])
    try {
      const cacheKey = `b3:app:${appId}:campaign:${cid}:pending_submissions`
      const cached = cacheGet<string[]>(cacheKey)
      if (cached) {
        console.log('[VerifyCampaign] Using cached pending list', { count: cached.length, cid })
        setPending(cached)
        // Also load previews for cached list
        const views: SubmissionView[] = []
        for (const subId of cached) {
          const meta = await fetchSubmissionMeta(subId)
          const audioSources: Array<{ name?: string; src: string }> = []
          const fields = Array.isArray(meta?.fields) ? meta.fields : []
          for (const f of fields) {
            if (String(f?.type || '').toLowerCase() === 'audio' && f?.file?.dataUrl) {
              audioSources.push({ name: f?.file?.name, src: f.file.dataUrl })
            }
          }
          const previewUrl = await drawSubmissionPreview(subId, meta)
          views.push({ id: subId, meta, previewUrl, audioSources })
        }
        setSubmissions(views)
        setLoading(false)
        return
      }

      const indexer = new algosdk.Indexer('', indexerServer, indexerPort)
      console.log('[VerifyCampaign] Querying indexer', { appId, indexerServer, indexerPort, cid })
      const res = await indexer.searchForTransactions().applicationID(appId).limit(1000).do()

      const createdPrefix = new TextEncoder().encode('submission_created:')
      const verifiedPrefix = new TextEncoder().encode('submission_verified:')
      const declinedPrefix = new TextEncoder().encode('submission_declined:')

      const createdForCampaign: Set<string> = new Set()
      const verified: Set<string> = new Set()
      const declined: Set<string> = new Set()

      let totalLogs = 0
      for (const tx of (res.transactions as any[]) ?? []) {
        for (const encoded of (tx.logs as string[]) ?? []) {
          totalLogs++
          try {
            const raw = Buffer.from(encoded, 'base64')
            // submission_created: campaignHash : ipfsHash : sender.bytes
            if (raw.length >= createdPrefix.length + 1 + 1 + 32) {
              let ok = true
              for (let i = 0; i < createdPrefix.length; i++)
                if (raw[i] !== createdPrefix[i]) {
                  ok = false
                  break
                }
              if (ok) {
                const senderStart = raw.length - 32
                if (raw[senderStart - 1] !== 0x3a) continue
                const middle = raw.slice(createdPrefix.length, senderStart - 1)
                // middle = campaignHash:ipfsHash (ASCII)
                const colonIdx = middle.indexOf(0x3a)
                if (colonIdx <= 0) continue
                const campaignHash = decodeAscii(middle.slice(0, colonIdx))
                const ipfsHash = decodeAscii(middle.slice(colonIdx + 1))
                if (campaignHash === cid && ipfsHash) {
                  createdForCampaign.add(ipfsHash)
                }
                continue // processed this log
              }
            }

            // submission_verified: submissionHash : receiver.bytes
            if (raw.length >= verifiedPrefix.length + 1 + 32) {
              let okV = true
              for (let i = 0; i < verifiedPrefix.length; i++)
                if (raw[i] !== verifiedPrefix[i]) {
                  okV = false
                  break
                }
              if (okV) {
                const recvStart = raw.length - 32
                if (raw[recvStart - 1] !== 0x3a) continue
                const subHash = decodeAscii(raw.slice(verifiedPrefix.length, recvStart - 1))
                if (subHash) verified.add(subHash)
                continue
              }
            }

            // submission_declined: submissionHash : creator.bytes
            if (raw.length >= declinedPrefix.length + 1 + 32) {
              let okD = true
              for (let i = 0; i < declinedPrefix.length; i++)
                if (raw[i] !== declinedPrefix[i]) {
                  okD = false
                  break
                }
              if (okD) {
                const crStart = raw.length - 32
                if (raw[crStart - 1] !== 0x3a) continue
                const subHash = decodeAscii(raw.slice(declinedPrefix.length, crStart - 1))
                if (subHash) declined.add(subHash)
                continue
              }
            }
          } catch {}
        }
      }

      console.log('[VerifyCampaign] Logs parsed', {
        totalLogs,
        created: createdForCampaign.size,
        verified: verified.size,
        declined: declined.size,
      })

      // pending = created - verified - declined
      const pendingList: string[] = []
      for (const h of createdForCampaign) if (!verified.has(h) && !declined.has(h)) pendingList.push(h)
      // order alphabetically for stability
      pendingList.sort((a, b) => a.localeCompare(b))
      console.log('[VerifyCampaign] Pending submissions', { cid, count: pendingList.length, hashes: pendingList })
      cacheSet(cacheKey, pendingList, cacheSecs)
      setPending(pendingList)
      // Fetch and prepare submission previews and audio links
      const views: SubmissionView[] = []
      for (const subId of pendingList) {
        const meta = await fetchSubmissionMeta(subId)
        const audioSources: Array<{ name?: string; src: string }> = []
        const fields = Array.isArray(meta?.fields) ? meta.fields : []
        for (const f of fields) {
          if (String(f?.type || '').toLowerCase() === 'audio' && f?.file?.dataUrl) {
            audioSources.push({ name: f?.file?.name, src: f.file.dataUrl })
          }
        }
        const previewUrl = await drawSubmissionPreview(subId, meta)
        views.push({ id: subId, meta, previewUrl, audioSources })
      }
      setSubmissions(views)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pending submissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  useEffect(() => {
    // Load campaign title for header
    if (!cid) {
      setCampaignTitle(null)
      return
    }
    ;(async () => {
      const meta = await fetchCampaignMeta(cid)
      const title = meta?.title || meta?.name || null
      setCampaignTitle(typeof title === 'string' ? title : null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  useEffect(() => {
    // Close overlay on Escape key
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function callContract(method: 'verify' | 'decline', submissionId: string) {
    if (!appId) throw new Error('Missing app id')
    if (!activeAddress) throw new Error('Connect wallet')
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig })
    algorand.setDefaultSigner(transactionSigner)
    const factory = new Bount3Factory({ algorand, defaultSender: activeAddress })
    const appClient = factory.getAppClientById({ appId: BigInt(appId) })
    const encoder = new TextEncoder()
    if (method === 'verify') {
      // verifySubmission performs inner transactions (payment + asset transfer) with fee=0, so cover them via a higher flat fee
      await appClient.send.verifySubmission({
        args: { submissionHash: encoder.encode(submissionId) },
        staticFee: microAlgos(4000), // cover outer app call (1000) + two inner txns (2x1000) with a little buffer
      })
    } else {
      await appClient.send.declineSubmission({ args: { submissionHash: encoder.encode(submissionId) } })
    }
  }

  async function handleAction(method: 'verify' | 'decline', submissionId: string) {
    try {
      setActioning(submissionId)
      await callContract(method, submissionId)
      // remove from UI and cache
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
      setPending((prev) => prev.filter((h) => h !== submissionId))
      setExpandedId(null)
      if (appId && cid) localStorage.removeItem(`b3:app:${appId}:campaign:${cid}:pending_submissions`)
    } catch (e) {
      console.error(`[VerifyCampaign] ${method} failed`, e)
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActioning(null)
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Verify submissions</h2>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{campaignTitle || 'Campaign'}</h3>
      {/* CID hidden per request */}
      {error && <div style={{ color: '#ffb4b4' }}>Error: {error}</div>}
      {loading && <p style={{ opacity: 0.85 }}>Loading pending submissions…</p>}
      {!loading && !error && pending.length === 0 && <p style={{ opacity: 0.9 }}>No pending submissions.</p>}

      {submissions.length > 0 && (
        <div className="OptionsGrid" style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
          {submissions.map((s) => (
            <div
              key={s.id}
              className="OptionCard"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => setExpandedId((cur) => (cur === s.id ? null : s.id))}
            >
              <div className="OptionInfoTop">
                <h2>Submission {s.id.slice(0, 8)}…</h2>
              </div>
              {s.previewUrl ? (
                <img className="OptionImage" src={s.previewUrl} alt={`Submission ${s.id}`} />
              ) : (
                <div style={{ padding: 12, opacity: 0.85 }}>No preview image</div>
              )}
              <div className="OptionInfoBottom">
                <p style={{ marginBottom: 0 }}>Submission: {s.id.slice(0, 10)}…</p>
              </div>
              {expandedId === s.id && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                  }}
                  onClick={() => setExpandedId(null)}
                >
                  <div
                    style={{
                      background: '#0b1020',
                      borderRadius: 12,
                      padding: 16,
                      maxWidth: '90vw',
                      maxHeight: '85vh',
                      overflow: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <h3 style={{ marginTop: 0 }}>Submission {s.id}</h3>
                      <button type="button" onClick={() => setExpandedId(null)} aria-label="Close">
                        ✕
                      </button>
                    </div>
                    {s.previewUrl ? (
                      <img src={s.previewUrl} alt={`Submission ${s.id}`} style={{ width: '100%', height: 'auto' }} />
                    ) : (
                      <div style={{ padding: 12, opacity: 0.85 }}>No preview available</div>
                    )}
                    {s.audioSources.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <h4>Audio</h4>
                        {s.audioSources.map((a, i) => (
                          <div key={i} style={{ marginTop: 6 }}>
                            <div style={{ opacity: 0.85 }}>{a.name || 'Audio'}:</div>
                            <audio controls src={a.src} style={{ width: '100%' }} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button type="button" disabled={actioning === s.id} onClick={() => void handleAction('verify', s.id)}>
                        {actioning === s.id ? 'Verifying…' : 'Verify'}
                      </button>
                      <button type="button" disabled={actioning === s.id} onClick={() => void handleAction('decline', s.id)}>
                        {actioning === s.id ? 'Declining…' : 'Decline'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh button removed per request */}
    </div>
  )
}
