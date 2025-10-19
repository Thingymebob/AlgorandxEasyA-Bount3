// Utilities to build transaction explorer links (Lora / fallback)

export function getLoraTxUrl(txId: string): string {
  const t = (import.meta.env as any).VITE_LORA_TX_URL_TEMPLATE as string | undefined
  const base = (import.meta.env as any).VITE_LORA_BASE_URL as string | undefined
  if (t && (t.includes('{txid}') || t.includes('{id}'))) {
    return t.replace('{txid}', encodeURIComponent(txId)).replace('{id}', encodeURIComponent(txId))
  }
  if (base) {
    // Treat base as the full prefix up to the transaction path, e.g.,
    // https://lora.algokit.io/localnet/transaction/
    const prefix = base.endsWith('/') ? base : `${base}/`
    return `${prefix}${encodeURIComponent(txId)}`
  }
  // Fallback default; adjust with env vars if your Lora differs
  return `https://lora.algokit.io/localnet/transaction/${encodeURIComponent(txId)}`
}
