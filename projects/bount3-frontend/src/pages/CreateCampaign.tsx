import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { useEffect, useMemo, useState } from 'react'

import { Bount3Factory } from '../contracts/Bount3'
import { getLoraTxUrl } from '../utils/explorer'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

/* CreateCampaign.tsx
  - Default export: CreateCampaign component with a polished two-column layout
  - Calculates campaign funding (reward pool + 5% fee + 100 ALGO deposit) and triggers an Algorand payment before pinning metadata
  - Submits the metadata to the backend, which stores the payload on IPFS and returns the resulting CID
*/
export default function CreateCampaign() {
  const [title, setTitle] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [longDesc, setLongDesc] = useState('')
  const [algoPaid, setAlgoPaid] = useState('')
  const [maxSubs, setMaxSubs] = useState('')
  const [datatypes, setDatatypes] = useState<Array<{ type: string; description: string }>>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [logoProcessing, setLogoProcessing] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [ipfsCid, setIpfsCid] = useState<string | null>(null)
  const [fundingTxId, setFundingTxId] = useState<string | null>(null)
  const [appCallTxId, setAppCallTxId] = useState<string | null>(null)

  const { transactionSigner, activeAddress } = useWallet()

  const algodClient = useMemo(() => {
    try {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      return AlgorandClient.fromConfig({ algodConfig })
    } catch (error) {
      console.error('[CreateCampaign] Failed to initialise Algorand client', error)
      return null
    }
  }, [])

  const securityDepositAlgo = 100
  const parsedAlgoReward = Number.parseFloat(algoPaid)
  const algoPerSubmission = Number.isFinite(parsedAlgoReward) && parsedAlgoReward > 0 ? parsedAlgoReward : 0
  const parsedMaxSubs = Number.parseInt(maxSubs, 10)
  const maxSubmissionsCount = Number.isFinite(parsedMaxSubs) && parsedMaxSubs > 0 ? parsedMaxSubs : 0
  const rewardPoolAlgo = algoPerSubmission && maxSubmissionsCount ? algoPerSubmission * maxSubmissionsCount : 0
  const platformFeeAlgo = rewardPoolAlgo ? Number((rewardPoolAlgo * 0.05).toFixed(2)) : 0
  const totalAlgoRequired = securityDepositAlgo + rewardPoolAlgo + platformFeeAlgo
  const totalAlgoDisplay = Number.isFinite(totalAlgoRequired)
    ? totalAlgoRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
  const totalMicroAlgoAmount = Math.round(totalAlgoRequired * 1_000_000)
  const appId = useMemo(() => {
    const raw = import.meta.env.VITE_BOUNT3_APP_ID
    if (!raw) {
      return null
    }

    const parsed = Number(raw)
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      console.error('[CreateCampaign] Invalid VITE_BOUNT3_APP_ID value', raw)
      return null
    }

    return parsed
  }, [])

  const appAddress = useMemo(() => {
    if (!appId) {
      return null
    }

    try {
      return algosdk.getApplicationAddress(appId)
    } catch (error) {
      console.error('[CreateCampaign] Failed to derive app address', { appId, error })
      return null
    }
  }, [appId])
  const MAX_INLINE_IMAGE_BYTES = 900 * 1024

  function dataUrlSizeBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',')
    const base64Payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
    return Math.ceil((base64Payload.length * 3) / 4)
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Unexpected reader result type'))
        }
      }
      reader.onerror = (event) => {
        reject(event instanceof ProgressEvent ? event : new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }

  function loadImageElement(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = (event) => reject(event)
      image.src = dataUrl
    })
  }

  async function createOptimizedDataUrl(file: File) {
    const originalDataUrl = await readFileAsDataUrl(file)
    if (dataUrlSizeBytes(originalDataUrl) <= MAX_INLINE_IMAGE_BYTES) {
      return originalDataUrl
    }

    const image = await loadImageElement(originalDataUrl)
    const maxDimension = 768
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const targetWidth = Math.max(1, Math.round(image.width * scale))
    const targetHeight = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context unavailable')
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const qualities = [0.82, 0.7, 0.6, 0.5, 0.4]
    let lastDataUrl = ''
    for (const quality of qualities) {
      lastDataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrlSizeBytes(lastDataUrl) <= MAX_INLINE_IMAGE_BYTES) {
        return lastDataUrl
      }
    }

    return lastDataUrl || originalDataUrl
  }

  useEffect(() => {
    if (!logoFile) {
      setLogoDataUrl(null)
      setLogoError(null)
      setLogoProcessing(false)
      return
    }

    const file = logoFile
    let cancelled = false
    setLogoProcessing(true)
    setLogoError(null)

    async function processLogo() {
      try {
        const optimized = await createOptimizedDataUrl(file)
        if (cancelled) {
          return
        }

        if (dataUrlSizeBytes(optimized) > MAX_INLINE_IMAGE_BYTES) {
          console.warn('[CreateCampaign] Optimized image still exceeds inline limit', {
            size: dataUrlSizeBytes(optimized),
          })
          setLogoError('Image is too large even after optimization. Please choose a smaller image (under 900KB).')
          setLogoDataUrl(null)
          return
        }

        setLogoDataUrl(optimized)
      } catch (error) {
        if (!cancelled) {
          console.error('[CreateCampaign] Failed to process logo file', error)
          setLogoError('We could not process that image. Try a different file.')
          setLogoDataUrl(null)
        }
      } finally {
        if (!cancelled) {
          setLogoProcessing(false)
        }
      }
    }

    void processLogo()

    return () => {
      cancelled = true
    }
  }, [logoFile])

  function buildCardText() {
    // Use /Immages/ as the canonical image folder. When migrating images, copy
    // them to public/Immages/ so they are available at runtime.
    return `TITLE: ${title}\nORGANISATION: ${organisation}\nSHORT_DESCRIPTION: ${shortDesc}\nLONG_DESCRIPTION: ${longDesc}\nALGO_PAID_PER_SUBMISSION: ${algoPaid}\nMAX_SUBMISSIONS: ${maxSubs}\nLOGO: logo.png\nDATATYPES: [JPG - "photo"]\n`
  }
  const preview = useMemo(() => {
    return {
      title: title || 'Your campaign title',
      organisation: organisation || 'Organisation name',
      shortDescription: shortDesc || 'Explain the goal of your bounty in one captivating line.',
      longDescription:
        longDesc || 'Share the problem you hope to solve, required submission format, timelines, and any judging criteria you will use.',
      algoPaid: algoPerSubmission ? `${algoPerSubmission} ALGO` : 'Set a reward',
      maxSubmissions: maxSubs || 'Set submission cap',
      platformFee: rewardPoolAlgo ? `${platformFeeAlgo} ALGO (5%)` : 'Calculated fee (5%)',
      securityDeposit: `${securityDepositAlgo} ALGO`,
      logoSrc: logoDataUrl ?? '/Immages/Create.jpg',
    }
  }, [
    title,
    organisation,
    shortDesc,
    longDesc,
    algoPerSubmission,
    maxSubs,
    rewardPoolAlgo,
    platformFeeAlgo,
    securityDepositAlgo,
    logoDataUrl,
  ])

  async function submitCampaign() {
    setSubmissionError(null)
    setIpfsCid(null)
    setFundingTxId(null)
    setAppCallTxId(null)

    if (logoProcessing) {
      setSubmissionError('Please wait for the campaign image to finish processing before submitting.')
      return
    }
    if (logoError) {
      setSubmissionError('Please resolve the image issue before submitting the campaign.')
      return
    }
    if (!transactionSigner || !activeAddress) {
      setSubmissionError('Connect your wallet before submitting a campaign.')
      return
    }
    if (!appId || !appAddress) {
      setSubmissionError('Campaign contract App ID is not configured. Set VITE_BOUNT3_APP_ID in your environment.')
      return
    }
    if (!algodClient) {
      setSubmissionError('Unable to initialise the Algorand client. Check your Algod environment variables.')
      return
    }
    if (!Number.isFinite(totalAlgoRequired) || totalAlgoRequired <= 0) {
      setSubmissionError('Enter valid reward and submission values to calculate a positive funding amount.')
      return
    }
    if (!Number.isFinite(totalMicroAlgoAmount) || totalMicroAlgoAmount <= 0) {
      setSubmissionError('Calculated funding amount is invalid. Please review your campaign details.')
      return
    }

    setIsSubmitting(true)

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
    const endpoint = `${backendUrl.replace(/\/$/, '')}/upload_to_ipfs`

    try {
      // 1) Upload metadata first to get the CID needed by the on-chain call
      const canonicalDatatypes = datatypes
        .filter((d) => d && d.type && d.description)
        .map((d) => ({ type: String(d.type).toLowerCase(), description: d.description.trim() }))

      const metadata = {
        title: title || preview.title,
        organisation,
        shortDescription: shortDesc,
        longDescription: longDesc,
        algoPaidPerSubmission: algoPerSubmission,
        rewardPoolAlgo,
        platformFeeAlgo,
        securityDepositAlgo,
        totalAlgoRequired,
        totalMicroAlgoAmount,
        fundingTransactionId: null,
        fundingWalletAddress: activeAddress,
        appId,
        appAddress,
        maxSubmissionsInput: maxSubs,
        maxSubmissions: maxSubmissionsCount,
        logoFilename: logoDataUrl ? (logoFile?.name ?? 'inline-logo.jpg') : null,
        ...(logoDataUrl ? { logoDataUrl } : {}),
        // Store expected submission fields; both capitalized and lowercase keys for compatibility
        Datatypes: canonicalDatatypes,
        datatypes: canonicalDatatypes,
        legacyCard: buildCardText(),
        generatedAt: new Date().toISOString(),
      }

      const formData = new FormData()
      formData.append('title', title || preview.title)
      formData.append('description', JSON.stringify(metadata))

      console.log('[CreateCampaign] Submitting campaign to backend', {
        endpoint,
        metadata,
        hasLogoFile: !!logoFile,
        logoFileName: logoFile?.name,
        logoFileSize: logoFile?.size,
        hasLogoDataUrl: !!logoDataUrl,
        logoProcessing,
        appId,
        appAddress,
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CreateCampaign] Backend returned error', errorText)
        throw new Error(`Backend error: ${errorText}`)
      }

      const result = await response.json()
      console.log('[CreateCampaign] Raw backend response', result)

      const cid = result.cid ?? result.IpfsHash ?? result.hash ?? result.CID ?? null
      if (!cid) {
        console.error('[CreateCampaign] Missing CID-like field in backend response', result)
        throw new Error('Upload succeeded but CID missing from response.')
      }

      // 2) Grouped on-chain call: payment + app method (createCampaign)
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      // set wallet signer
      algorand.setDefaultSigner(transactionSigner)

      // Build client for the deployed app
      const factory = new Bount3Factory({ algorand, defaultSender: activeAddress })
      const appClient = factory.getAppClientById({ appId: BigInt(appId) })

      // Compute microalgo amounts as BigInt
      const toMicroAlgoBigInt = (algo: number) => BigInt(Math.round(algo * 1_000_000))
      const perSubmissionMicro = toMicroAlgoBigInt(algoPerSubmission)
      const goalSubmissionsBig = BigInt(maxSubmissionsCount)
      const paidAmount = perSubmissionMicro * (goalSubmissionsBig > 0n ? goalSubmissionsBig : 0n)
      const feeAmount = (paidAmount * 5n) / 100n // 5%
      const depositAmount = 100n * 1_000_000n

      const totalRequiredMicro = depositAmount + feeAmount + paidAmount

      const params = await algorand.client.algod.getTransactionParams().do()
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: appAddress!,
        amount: Number(totalRequiredMicro),
        suggestedParams: params,
      })

      const encoder = new TextEncoder()
      const ipfsHashBytes = encoder.encode(cid)

      console.log('[CreateCampaign] Sending grouped createCampaign', {
        appId,
        ipfsHash: cid,
        depositAmount: depositAmount.toString(),
        feeAmount: feeAmount.toString(),
        goalSubmissions: goalSubmissionsBig.toString(),
        paidAmount: paidAmount.toString(),
        totalRequiredMicro: totalRequiredMicro.toString(),
      })

      const groupResult = await appClient.send.createCampaign({
        args: {
          ipfsHash: ipfsHashBytes,
          payTxn: paymentTxn,
          depositAmount,
          feeAmount,
          goalSubmissions: goalSubmissionsBig,
          paidAmount,
        },
      })

      const fundingTx = groupResult.txIds?.[0] ?? null
      const appCallTx = groupResult.txIds?.[1] ?? null
      setFundingTxId(fundingTx)
      setAppCallTxId(appCallTx)

      console.log('[CreateCampaign] Group sent; return + txIds', { return: groupResult.return, txIds: groupResult.txIds })
      setIpfsCid(cid)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setSubmissionError(message)
      console.error('[CreateCampaign] Failed to submit campaign', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="CreateCampaignLayout">
      <div className="FormSection">
        <h1>Create a new campaign</h1>
        <p style={{ marginTop: 0, marginBottom: '1.5em', color: 'rgba(255, 255, 255, 0.85)' }}>
          Describe your bounty with clear expectations and rewards. When you submit, we will reserve a 5% platform fee and a 100 ALGO
          deposit before pinning the metadata to IPFS via the backend service.
        </p>
        <form
          className="CreateCampaignForm"
          onSubmit={(e) => {
            e.preventDefault()
            void submitCampaign()
          }}
        >
          <label htmlFor="campaign-title">Campaign title *</label>
          <input
            id="campaign-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Eg. Street-level photos for road quality analysis"
            required
          />

          <label htmlFor="campaign-organisation">Organisation</label>
          <input
            id="campaign-organisation"
            type="text"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Who is sponsoring this bounty?"
          />

          <label htmlFor="campaign-short-desc">Short description</label>
          <textarea
            id="campaign-short-desc"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            rows={2}
            placeholder="A single sentence that pitches the campaign"
          />

          <label htmlFor="campaign-long-desc">Long description</label>
          <textarea
            id="campaign-long-desc"
            value={longDesc}
            onChange={(e) => setLongDesc(e.target.value)}
            rows={6}
            placeholder="Share context, submission steps, review criteria, timelines, and helpful resources."
          />

          <label htmlFor="campaign-algo">ALGO paid per submission</label>
          <input id="campaign-algo" type="text" value={algoPaid} onChange={(e) => setAlgoPaid(e.target.value)} placeholder="Eg. 5" />

          <label htmlFor="campaign-max-submissions">Max submissions</label>
          <input
            id="campaign-max-submissions"
            type="text"
            value={maxSubs}
            onChange={(e) => setMaxSubs(e.target.value)}
            placeholder="Eg. 250"
          />

          <fieldset style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
            <legend style={{ padding: '0 0.5rem' }}>Submission fields (Datatypes)</legend>
            {datatypes.length === 0 && (
              <p style={{ marginTop: 0, opacity: 0.85 }}>
                Define what contributors should submit (e.g., an image, an audio clip, a text answer).
              </p>
            )}
            {datatypes.map((dt, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <select
                  aria-label={`datatype-type-${i}`}
                  value={dt.type}
                  onChange={(e) => {
                    const val = e.target.value
                    setDatatypes((prev) => prev.map((d, idx) => (idx === i ? { ...d, type: val } : d)))
                  }}
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                  <option value="bool">Boolean</option>
                </select>
                <input
                  type="text"
                  placeholder={'Describe what to provide (e.g., "Front-side photo")'}
                  value={dt.description}
                  onChange={(e) => {
                    const val = e.target.value
                    setDatatypes((prev) => prev.map((d, idx) => (idx === i ? { ...d, description: val } : d)))
                  }}
                />
                <button
                  type="button"
                  onClick={() => setDatatypes((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{ padding: '0.4rem 0.6rem' }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() => setDatatypes((prev) => [...prev, { type: 'text', description: '' }])}
                style={{ marginTop: '0.5rem' }}
              >
                + Add field
              </button>
            </div>
          </fieldset>

          <label htmlFor="campaign-logo">Campaign image (optional)</label>
          <input
            id="campaign-logo"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setLogoFile(file)
            }}
          />

          <button type="submit" disabled={isSubmitting || logoProcessing}>
            {isSubmitting
              ? 'Submitting campaign…'
              : logoProcessing
                ? 'Processing image…'
                : `Submit campaign – Pay ${totalAlgoDisplay} ALGO`}
          </button>

          {logoError && (
            <div style={{ marginTop: '0.75em', color: '#ffc5c5' }}>
              <strong>Image issue:</strong> {logoError}
            </div>
          )}

          <div style={{ marginTop: '1em', minHeight: '2.4em', color: submissionError ? '#ffc5c5' : '#b2f5ea' }}>
            {submissionError && <span>Error: {submissionError}</span>}
            {(fundingTxId || appCallTxId) && (
              <div style={{ marginTop: '0.4em' }}>
                <div>Transactions:</div>
                {fundingTxId && (
                  <div>
                    <a href={getLoraTxUrl(fundingTxId)} target="_blank" rel="noreferrer">
                      View funding payment on Lora
                    </a>
                  </div>
                )}
                {appCallTxId && (
                  <div>
                    <a href={getLoraTxUrl(appCallTxId)} target="_blank" rel="noreferrer">
                      View app call on Lora
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="TilesSection">
        <h2>Live campaign preview</h2>
        <div className="CampaignInfoCard" style={{ width: '100%', maxWidth: '620px' }}>
          <img className="CampaignLogo" src={preview.logoSrc} alt="Campaign illustrative graphic" />
          <h1>{preview.title}</h1>
          <h3>{preview.organisation}</h3>
          <p>{preview.shortDescription}</p>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.92)' }}>{preview.longDescription}</p>
        </div>

        <div className="TilesGrid" style={{ marginTop: '2em' }}>
          <div className="DataTile" style={{ borderColor: 'var(--cat-image-border)' }}>
            <div className="TileHeader">
              <strong>Reward</strong>
              <span>{preview.algoPaid}</span>
            </div>
            <p>Reward contributors with ALGO per approved submission. Consider bonuses for high-impact work.</p>
          </div>

          <div className="DataTile" style={{ borderColor: 'var(--cat-video-border)' }}>
            <div className="TileHeader">
              <strong>Submission cap</strong>
              <span>{preview.maxSubmissions}</span>
            </div>
            <p>Prevent overwhelm by capping the number of submissions reviewers need to process.</p>
          </div>

          <div className="DataTile" style={{ borderColor: 'var(--cat-data-border)' }}>
            <div className="TileHeader">
              <strong>Platform fee</strong>
              <span>{preview.platformFee}</span>
            </div>
            <p>We automatically reserve 5% to keep the bounty marketplace running and secure.</p>
          </div>

          <div className="DataTile" style={{ borderColor: 'var(--cat-audio-border)' }}>
            <div className="TileHeader">
              <strong>Security deposit</strong>
              <span>{preview.securityDeposit}</span>
            </div>
            <p>The deposit is held in escrow so you can pay out contributors without delay.</p>
          </div>

          <div className="DataTile" style={{ borderColor: 'var(--cat-doc-border)' }}>
            <div className="TileHeader">
              <strong>Metadata</strong>
              <span>IPFS</span>
            </div>
            <p>Campaign details are pinned to IPFS via the backend. Share the resulting CID with your community.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
