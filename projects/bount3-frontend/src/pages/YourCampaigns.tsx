import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { Buffer } from 'buffer'
import { useEffect, useMemo, useState } from 'react'
import CampaignCard from '../components/CampaignCard'
import type { Campaign } from '../utils/parseCardText'

/* YourCampaigns.tsx
   - Lists campaigns created by the connected wallet by scanning indexer logs
   - Log format: Bytes(b"campaign_created:") + sender.bytes + Bytes(b":") + IPFSHash
*/
export default function YourCampaigns() {
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000'
  const indexerServer = (import.meta.env.VITE_INDEXER_SERVER as string | undefined) || 'http://127.0.0.1'
  const indexerPort = Number((import.meta.env.VITE_INDEXER_PORT as string | undefined) || 8980)

  const appId = useMemo(() => {
    const raw = import.meta.env.VITE_BOUNT3_APP_ID
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [])

  // Local cache with TTL via localStorage
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

  function arraysEqual(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
    return true
  }

  async function loadMyCampaigns() {
    if (!appId) {
      setError('Missing or invalid VITE_BOUNT3_APP_ID')
      return
    }
    if (!activeAddress) {
      setError('Connect your wallet to see your campaigns.')
      return
    }
    setLoading(true)
    setError(null)
    setCampaigns([])
    try {
      const myPk = algosdk.decodeAddress(activeAddress).publicKey
      const cidsCacheKey = `b3:app:${appId}:owner:${activeAddress}:cids`
      let myCids: string[] | null = cacheGet<string[]>(cidsCacheKey)
      if (myCids && myCids.length) {
        console.log('[YourCampaigns] Using cached CIDs', { count: myCids.length })
      }
      if (!myCids) {
        const indexer = new algosdk.Indexer('', indexerServer, indexerPort)
        console.log('[YourCampaigns] Querying indexer for appId', { appId, indexerServer, indexerPort, activeAddress })
        const res = await indexer.searchForTransactions().applicationID(appId).limit(1000).do()

        const prefixBytes = new TextEncoder().encode('campaign_created:')
        type Item = { cid: string; round: number }
        const mine: Item[] = []
        let totalLogs = 0
        let matchedLogs = 0
        let senderMatchedByTxField = 0
        for (const tx of (res.transactions as any[]) ?? []) {
          const round = typeof (tx as any)['confirmed-round'] === 'number' ? (tx as any)['confirmed-round'] : (tx as any).confirmedRound
          const txSender: string | undefined = (tx as any).sender
          const txSenderMatches = txSender && txSender === activeAddress
          for (const encoded of (tx.logs as string[]) ?? []) {
            totalLogs++
            try {
              const raw = Buffer.from(encoded, 'base64')
              // Ensure prefix matches
              if (raw.length < prefixBytes.length + 33) continue
              let prefixOk = true
              for (let i = 0; i < prefixBytes.length; i++)
                if (raw[i] !== prefixBytes[i]) {
                  prefixOk = false
                  break
                }
              if (!prefixOk) continue
              // Next 32 bytes: sender
              const senderBytes = raw.slice(prefixBytes.length, prefixBytes.length + 32)
              // Following byte must be ':'
              if (raw[prefixBytes.length + 32] !== 0x3a) continue
              // Remaining bytes: ASCII CID
              const cidBytes = raw.slice(prefixBytes.length + 33)
              const cidStr = new TextDecoder().decode(cidBytes)
              if (!cidStr) continue
              if (arraysEqual(senderBytes, myPk)) {
                matchedLogs++
                mine.push({ cid: cidStr, round: typeof round === 'number' ? round : 0 })
              } else if (txSenderMatches) {
                // Fallback: some environments may not reconstruct sender bytes or logs consistently; match by tx sender
                senderMatchedByTxField++
                mine.push({ cid: cidStr, round: typeof round === 'number' ? round : 0 })
              }
            } catch (e) {
              // ignore malformed log
            }
          }
        }

        console.log('[YourCampaigns] Scan complete', {
          totalTransactions: (res.transactions as any[])?.length ?? 0,
          totalLogs,
          matchedLogsByBytes: matchedLogs,
          matchedByTxSenderField: senderMatchedByTxField,
          mineCount: mine.length,
        })

        // Sort newest first, then by CID and de-duplicate
        mine.sort((a, b) => b.round - a.round || a.cid.localeCompare(b.cid))
        const dedup = new Set<string>()
        const list: string[] = []
        for (const m of mine) {
          if (!dedup.has(m.cid)) {
            dedup.add(m.cid)
            list.push(m.cid)
          }
        }
        myCids = list
        console.log('[YourCampaigns] My campaign CIDs', { count: myCids.length, cids: myCids, address: activeAddress })
        cacheSet(cidsCacheKey, myCids, cacheSecs)
      }

      // Fetch metadata for each CID via backend
      async function fetchOne(cid: string) {
        try {
          const metaCacheKey = `b3:campaign:${cid}:meta`
          const cached = cacheGet<Campaign>(metaCacheKey)
          if (cached) {
            console.log('[YourCampaigns] Cache hit for metadata', cid)
            return cached
          }
          console.log('[YourCampaigns] Fetching metadata', cid)
          const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch_metadata/${encodeURIComponent(cid)}`)
          const data = await resp.json()
          if (!resp.ok || data?.error) return null
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
      for (let i = 0; i < (myCids ?? []).length; i += 10) {
        const chunk = (myCids ?? []).slice(i, i + 10)
        const chunkResults = await Promise.all(chunk.map(fetchOne))
        for (const r of chunkResults) if (r) results.push(r)
      }
      console.log('[YourCampaigns] Loaded metadata', { fetched: results.length, total: (myCids ?? []).length })
      setCampaigns(results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load from indexer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMyCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress])

  return (
    <div>
      {!activeAddress && <p style={{ opacity: 0.9 }}>Connect your wallet to see your campaigns.</p>}
      {error && <div style={{ color: '#ffb4b4', marginBottom: '0.75rem' }}>Error: {error}</div>}

      <div className="OptionsGrid" style={{ marginBottom: '1.25rem' }}>
        {/* Always-visible tile: Create your own campaign */}
        <a className="OptionCard" href="/create">
          <img className="OptionImage" src="/Immages/Create.jpg" alt="an image of a pencil drawing on paper" />
          <div className="OptionInfoTop">
            <h2>Create your own campaign</h2>
          </div>
          <div className="OptionInfoBottom">
            <p>Create your own campaign to gather information for whatever your mind can think of!</p>
          </div>
        </a>

        {/* Dynamically loaded campaigns (navigate to verify page) */}
        {campaigns.map((c, i) => (
          <CampaignCard key={i} campaign={c} href={c.cid ? `/campaign/verify/${encodeURIComponent(c.cid)}` : undefined} />
        ))}
      </div>

      {loading && campaigns.length === 0 && <p style={{ opacity: 0.85 }}>Loading your campaigns…</p>}
      {!loading && campaigns.length === 0 && !error && activeAddress && (
        <p style={{ opacity: 0.85 }}>No campaigns found for {activeAddress}.</p>
      )}
    </div>
  )
}
