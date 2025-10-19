import algosdk from 'algosdk'
import { Buffer } from 'buffer'
import { useEffect, useMemo, useState } from 'react'
import CampaignCard from '../components/CampaignCard'
import type { Campaign } from '../utils/parseCardText'

/* MainPage.tsx
   - Default export: MainPage (renders a public campaign card loaded dynamically)
   - Provides a textbox to paste an IPFS CID, fetches metadata via the backend `/fetch_metadata/{cid}` endpoint,
     and renders a CampaignCard from the returned metadata.
*/
export default function MainPage() {
  const [chainLoading, setChainLoading] = useState(false)
  const [chainError, setChainError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000'
  const indexerServer = (import.meta.env.VITE_INDEXER_SERVER as string | undefined) || 'http://127.0.0.1'
  const indexerPort = Number((import.meta.env.VITE_INDEXER_PORT as string | undefined) || 8980)
  const appId = useMemo(() => {
    const raw = import.meta.env.VITE_BOUNT3_APP_ID
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [])

  // Removed manual CID loader; campaigns are sourced from on-chain logs only.

  // Lightweight localStorage cache with TTL
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

  function splitBuffer(buf: Uint8Array, byteVal: number) {
    const parts: Uint8Array[] = []
    let start = 0
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === byteVal) {
        parts.push(buf.slice(start, i))
        start = i + 1
      }
    }
    parts.push(buf.slice(start))
    return parts
  }

  async function loadCampaignsFromChain() {
    if (!appId) {
      setChainError('Missing or invalid VITE_BOUNT3_APP_ID')
      return
    }
    setChainLoading(true)
    setChainError(null)
    setCampaigns([])
    try {
      // Try cached CID list first
      const cidsCacheKey = `b3:app:${appId}:cids`
      let allCids: string[] | null = cacheGet<string[]>(cidsCacheKey)
      if (allCids && allCids.length) {
        console.log('[MainPage] Using cached CIDs', { count: allCids.length })
      }
      if (!allCids) {
        const indexer = new algosdk.Indexer('', indexerServer, indexerPort)
        const res = await indexer.searchForTransactions().applicationID(appId).limit(1000).do()

        type CidSeen = { cid: string; round: number }
        const seen: CidSeen[] = []
        const prefix = new TextEncoder().encode('campaign_created:')
        for (const tx of (res.transactions as any[]) ?? []) {
          for (const encoded of (tx.logs as string[]) ?? []) {
            try {
              const raw = Buffer.from(encoded, 'base64')
              if (raw.length < prefix.length + 33) continue
              let ok = true
              for (let i = 0; i < prefix.length; i++)
                if (raw[i] !== prefix[i]) {
                  ok = false
                  break
                }
              if (!ok) continue
              // Ensure separating ':' after 32-byte sender
              const colonIndex = prefix.length + 32
              if (raw[colonIndex] !== 0x3a) continue
              // Remaining is ASCII CID
              const ipfsCid = new TextDecoder().decode(raw.slice(colonIndex + 1))
              if (ipfsCid) {
                const round =
                  typeof (tx as any)['confirmed-round'] === 'number' ? (tx as any)['confirmed-round'] : (tx as any).confirmedRound
                seen.push({ cid: ipfsCid, round: typeof round === 'number' ? round : 0 })
              }
            } catch {}
          }
        }

        // Deterministic ordering: newest first by confirmed round, then by CID
        seen.sort((a, b) => b.round - a.round || a.cid.localeCompare(b.cid))
        // Unique by CID preserving order
        const list: string[] = []
        const dedup = new Set<string>()
        for (const s of seen) {
          if (!dedup.has(s.cid)) {
            dedup.add(s.cid)
            list.push(s.cid)
          }
        }
        console.log('[MainPage] Discovered campaign CIDs from chain', { appId, count: list.length, cids: list })
        cacheSet(cidsCacheKey, list, cacheSecs)
        allCids = list
      }
      const fetchOne = async (cid: string) => {
        try {
          const metaCacheKey = `b3:campaign:${cid}:meta`
          const cached = cacheGet<Campaign>(metaCacheKey)
          if (cached) {
            console.log('[MainPage] Cache hit for metadata', cid)
            return cached
          }
          console.log('[MainPage] Fetching metadata for CID', cid)
          const res = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch_metadata/${encodeURIComponent(cid)}`)
          const data = await res.json()
          if (!res.ok || data?.error) return null
          const rawTitle: string | undefined = data?.title
          let desc: any = data?.description
          if (typeof desc === 'string') {
            try {
              desc = JSON.parse(desc)
            } catch {}
          }
          const c: Campaign = {
            title: (desc?.title || rawTitle || cid) as string,
            organisation: desc?.organisation,
            shortDescription: desc?.shortDescription,
            longDescription: desc?.longDescription,
            cid,
            algoPaid:
              typeof desc?.algoPaidPerSubmission === 'number' || typeof desc?.algoPaidPerSubmission === 'string'
                ? `${desc.algoPaidPerSubmission} ALGO`
                : undefined,
            maxSubmissions: desc?.maxSubmissions
              ? String(desc.maxSubmissions)
              : desc?.maxSubmissionsInput
                ? String(desc.maxSubmissionsInput)
                : undefined,
            logo: desc?.logoDataUrl || (desc?.logoFilename ? `/Immages/${desc.logoFilename}` : undefined),
          }
          cacheSet(metaCacheKey, c, metaCacheSecs)
          return c
        } catch {
          return null
        }
      }

      const results: Campaign[] = []
      // simple batching of 10
      for (let i = 0; i < (allCids ?? []).length; i += 10) {
        const chunk = (allCids ?? []).slice(i, i + 10)
        const chunkResults = await Promise.all(chunk.map(fetchOne))
        for (const r of chunkResults) if (r) results.push(r)
      }
      console.log('[MainPage] Finished fetching metadata for CIDs', {
        fetched: results.length,
        total: (allCids ?? []).length,
      })
      setCampaigns(results)
    } catch (e) {
      setChainError(e instanceof Error ? e.message : 'Failed to load from indexer (CORS or network?)')
    } finally {
      setChainLoading(false)
    }
  }

  useEffect(() => {
    // Load from chain automatically on page load
    void loadCampaignsFromChain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {chainError && <div style={{ color: '#ffb4b4', marginBottom: '0.75rem' }}>Chain error: {chainError}</div>}

      {campaigns.length > 0 && (
        <div className="OptionsGrid" style={{ marginBottom: '1.25rem' }}>
          {campaigns.map((c, i) => (
            // Public campaigns should navigate to the submission page
            <CampaignCard key={i} campaign={c} href={c.cid ? `/campaign/cid/${encodeURIComponent(c.cid)}` : undefined} />
          ))}
        </div>
      )}
      {chainLoading && campaigns.length === 0 && <p style={{ opacity: 0.85 }}>Loading campaigns from chain…</p>}
      {!chainLoading && campaigns.length === 0 && !chainError && <p style={{ opacity: 0.85 }}>No campaigns found on-chain yet.</p>}
    </div>
  )
}
