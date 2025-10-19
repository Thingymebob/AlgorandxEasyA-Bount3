import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bount3Factory } from '../contracts/Bount3'
import { getLoraTxUrl } from '../utils/explorer'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Campaign, parseCardText } from '../utils/parseCardText'

/* CampaignViewer.tsx
   - Default export: CampaignViewer component
   - Reads the `title` route param and fetches `/cards/${title}.txt` from public/cards
   - Renders campaign details and generates upload inputs according to DATATYPES
   - Uses /placeholders/logo.png when no real logo is available
*/
export default function CampaignViewer() {
  const { title, cid } = useParams<{ title?: string; cid?: string }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitTxId, setSubmitTxId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8000'
  const { transactionSigner, activeAddress } = useWallet()

  type FieldState = { type: string; desc: string; text?: string; bool?: boolean; file?: File | null }
  const [fields, setFields] = useState<FieldState[]>([])

  const mode: 'cid' | 'title' | null = useMemo(() => {
    if (cid) return 'cid'
    if (title) return 'title'
    return null
  }, [cid, title])

  useEffect(() => {
    async function loadByCid(c: string) {
      try {
        const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch_metadata/${encodeURIComponent(c)}`)
        const data = await resp.json()
        if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to fetch metadata')
        const rawTitle: string | undefined = data?.title
        let desc: any = data?.description
        if (typeof desc === 'string') {
          try {
            desc = JSON.parse(desc)
          } catch {}
        }
        // Normalize submission field definitions from metadata
        const metaDts: Array<any> = (desc?.Datatypes || desc?.datatypes || []) as Array<any>
        const normDts = Array.isArray(metaDts)
          ? metaDts
              .filter((x) => x && typeof x === 'object')
              .map((x) => ({ type: String(x.type || '').toLowerCase(), desc: String(x.description || x.desc || '') }))
              .filter((x) => x.type && x.desc)
          : []
        const parsed: Campaign = {
          title: (desc?.title || rawTitle || c) as string,
          organisation: desc?.organisation,
          shortDescription: desc?.shortDescription,
          longDescription: desc?.longDescription,
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
          cid: c,
          datatypes: normDts,
        }
        setCampaign(parsed)
        setFields(normDts.map((d) => ({ type: d.type, desc: d.desc, text: '', bool: false, file: null })))
      } catch (e: any) {
        setError(e.message || String(e))
      }
    }

    async function loadByTitle(t: string) {
      try {
        const resp = await fetch(`/cards/${encodeURIComponent(t)}.txt`)
        if (!resp.ok) throw new Error('Campaign not found')
        const txt = await resp.text()
        const parsed = parseCardText(txt)
        setCampaign(parsed)
        if (parsed.datatypes && parsed.datatypes.length) {
          setFields(parsed.datatypes.map((d) => ({ type: d.type.toLowerCase(), desc: d.desc, text: '', bool: false, file: null })))
        } else {
          setFields([])
        }
      } catch (e: any) {
        setError(e.message || String(e))
      }
    }

    setCampaign(null)
    setError(null)
    if (mode === 'cid' && cid) {
      void loadByCid(cid)
    } else if (mode === 'title' && title) {
      void loadByTitle(title)
    }
  }, [mode, cid, title, backendUrl])

  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>
  if (!campaign) return <div>Loading campaign...</div>

  const MAX_INLINE_BYTES = 900 * 1024

  function dataUrlSizeBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',')
    const base64Payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
    return Math.ceil((base64Payload.length * 3) / 4)
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('Unexpected reader result'))
      }
      reader.onerror = (e) => reject(e instanceof ProgressEvent ? new Error('Read failed') : new Error('Read failed'))
      reader.readAsDataURL(file)
    })
  }

  async function buildSubmissionPayload() {
    // Convert selected field values into a single JSON payload suitable for backend pinning.
    const items: any[] = []
    for (const f of fields) {
      const t = (f.type || '').toLowerCase()
      if (t === 'text') {
        items.push({ type: 'text', description: f.desc, value: f.text ?? '' })
      } else if (t === 'bool' || t === 'boolean') {
        items.push({ type: 'bool', description: f.desc, value: !!f.bool })
      } else if (t === 'image' || t === 'audio') {
        if (f.file) {
          const dataUrl = await readFileAsDataUrl(f.file)
          if (dataUrlSizeBytes(dataUrl) > MAX_INLINE_BYTES) {
            throw new Error(`File for "${f.desc}" is too large; please choose a smaller file.`)
          }
          items.push({ type: t, description: f.desc, file: { name: f.file.name, dataUrl } })
        } else {
          items.push({ type: t, description: f.desc, file: null })
        }
      } else {
        if (f.file) {
          const dataUrl = await readFileAsDataUrl(f.file)
          if (dataUrlSizeBytes(dataUrl) > MAX_INLINE_BYTES) {
            throw new Error(`File for "${f.desc}" is too large; please choose a smaller file.`)
          }
          items.push({ type: t, description: f.desc, file: { name: f.file.name, dataUrl } })
        } else {
          items.push({ type: t, description: f.desc })
        }
      }
    }

    const payload = {
      kind: 'submission',
      campaignCid: campaign?.cid ?? cid ?? null,
      campaignTitle: campaign?.title ?? '',
      createdAt: new Date().toISOString(),
      fields: items,
    }
    return payload
  }

  async function handleSubmit() {
    setSubmitError(null)
    setSubmitSuccess(null)
    setSubmitTxId(null)
    if (!cid && !campaign?.cid) {
      setSubmitError('Missing campaign CID in URL')
      return
    }
    if (!transactionSigner || !activeAddress) {
      setSubmitError('Connect your wallet to submit.')
      return
    }
    try {
      setIsSubmitting(true)
      const submission = await buildSubmissionPayload()
      const formData = new FormData()
      formData.append('title', `${campaign?.title ?? 'Campaign'} submission`)
      formData.append('description', JSON.stringify(submission))

      const endpoint = `${backendUrl.replace(/\/$/, '')}/upload_to_ipfs`
      const resp = await fetch(endpoint, { method: 'POST', body: formData })
      const result = await resp.json().catch(() => ({}))
      if (!resp.ok || result?.error) {
        throw new Error(result?.error || 'Failed to upload submission to IPFS backend')
      }
      const submissionCid: string | null = result.cid ?? result.IpfsHash ?? result.hash ?? result.CID ?? null
      if (!submissionCid) throw new Error('Upload succeeded but submission CID missing from response')

      // Call contract: sendSubmission(IPFSHash=submissionCid, campaignHash=campaignCid)
      const encoder = new TextEncoder()
      const IPFSHash = encoder.encode(submissionCid)
      const campaignHash = encoder.encode((campaign?.cid ?? cid)!)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const appIdRaw = import.meta.env.VITE_BOUNT3_APP_ID
      const appId = appIdRaw ? BigInt(appIdRaw) : null
      if (!appId || appId <= 0n) throw new Error('Missing or invalid VITE_BOUNT3_APP_ID')

      const factory = new Bount3Factory({ algorand, defaultSender: activeAddress })
      const appClient = factory.getAppClientById({ appId })

      const sendResult = await appClient.send.sendSubmission({ args: { ipfsHash: IPFSHash, campaignHash } })
      const txId = sendResult?.txIds?.[0] ?? null
      setSubmitTxId(txId)
      setSubmitSuccess('Submission sent successfully.')
    } catch (e: any) {
      setSubmitError(e.message || String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="CampaignInfoCard">
      <img className="CampaignLogo" src={campaign.logo || '/Immages/logo.png'} alt={campaign.title} />
      <h1>{campaign.title}</h1>
      <h3>{campaign.organisation}</h3>
      <p>
        <strong>Campaign description and goals:</strong>
      </p>
      <p>{campaign.longDescription}</p>
      <p>
        <strong>ALGO Paid per Submission:</strong> {campaign.algoPaid}
      </p>
      <p>
        <strong>Maximum number of Submissions:</strong> {campaign.maxSubmissions}
      </p>

      <div className="UploadSection">
        <h3>Submit Your Data</h3>
        {fields && fields.length ? (
          fields.map((dt, i) => {
            const t = dt.type.toLowerCase()
            const id = `field-${i}`
            if (t === 'text') {
              return (
                <div className="UploadItem" key={i}>
                  <label htmlFor={id}>{dt.desc}</label>
                  <textarea
                    id={id}
                    className="UploadInput"
                    rows={3}
                    placeholder="Type your answer here"
                    value={dt.text ?? ''}
                    onChange={(e) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, text: e.target.value } : f)))}
                  />
                </div>
              )
            } else if (t === 'bool' || t === 'boolean') {
              return (
                <div className="UploadItem" key={i}>
                  <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={!!dt.bool}
                      onChange={(e) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, bool: e.target.checked } : f)))}
                    />{' '}
                    {dt.desc}
                  </label>
                </div>
              )
            } else if (t === 'image') {
              return (
                <div className="UploadItem" key={i}>
                  <label htmlFor={id}>{dt.desc}</label>
                  <input
                    id={id}
                    className="UploadInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, file: e.target.files?.[0] ?? null } : f)))
                    }
                  />
                </div>
              )
            } else if (t === 'audio') {
              return (
                <div className="UploadItem" key={i}>
                  <label htmlFor={id}>{dt.desc}</label>
                  <input
                    id={id}
                    className="UploadInput"
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, file: e.target.files?.[0] ?? null } : f)))
                    }
                  />
                </div>
              )
            }
            // Fallback to a generic file input
            return (
              <div className="UploadItem" key={i}>
                <label htmlFor={id}>
                  {dt.type}: {dt.desc}
                </label>
                <input
                  id={id}
                  className="UploadInput"
                  type="file"
                  onChange={(e) => setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, file: e.target.files?.[0] ?? null } : f)))}
                />
              </div>
            )
          })
        ) : (
          <div className="UploadItem">
            <label htmlFor="upload-0">Upload file</label>
            <input id="upload-0" className="UploadInput" type="file" />
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button className="SubmitDataButton" type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Submitting…' : 'Submit to Campaign'}
          </button>
        </div>
        {submitError && <div style={{ marginTop: 8, color: '#ffc5c5' }}>Error submitting: {submitError}</div>}
        {submitSuccess && (
          <div style={{ marginTop: 8, color: '#b2f5ea' }}>
            {submitSuccess}
            {submitTxId && (
              <div style={{ marginTop: 6 }}>
                <a href={getLoraTxUrl(submitTxId)} target="_blank" rel="noreferrer">
                  View on Lora explorer
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
