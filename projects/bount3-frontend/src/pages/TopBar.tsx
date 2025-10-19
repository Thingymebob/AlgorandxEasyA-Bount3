import { useWallet, Wallet } from '@txnlab/use-wallet-react'
import { useEffect, useState } from 'react'
import ConnectWallet from '../components/ConnectWallet'
import { ellipseAddress } from '../utils/ellipseAddress'

/* TopBar.tsx
  - Default export: TopBar React component (renders navigation links)
  - Wallet button mirrors the example behaviour but attempts an auto-connect first; extensive logs
    trace connection attempts, fallbacks, and provider availability.
  - Import note: TopBar imports ConnectWallet with: import ConnectWallet from '../components/ConnectWallet'
*/
export default function TopBar() {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [isAutoConnecting, setIsAutoConnecting] = useState<boolean>(false)
  const { activeAddress, wallets, transactionSigner } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal((prev) => !prev)
  }

  useEffect(() => {
    console.log('[TopBar] activeAddress changed:', activeAddress ?? 'None')
  }, [activeAddress])

  useEffect(() => {
    console.log('[TopBar] openWalletModal state:', openWalletModal)
  }, [openWalletModal])

  useEffect(() => {
    console.log('[TopBar] detected wallet providers:', wallets?.map((w) => w.id) ?? [])
  }, [wallets])

  useEffect(() => {
    console.log('[TopBar] isAutoConnecting state:', isAutoConnecting)
  }, [isAutoConnecting])

  const pickAutoConnectWallet = (availableWallets: Wallet[]): Wallet => {
    const preferredOrder = ['pera', 'defly', 'exodus', 'kmd']
    const normalized = availableWallets.map((wallet) => ({
      wallet,
      key: wallet.metadata.name.toLowerCase(),
    }))

    for (const preferred of preferredOrder) {
      const found = normalized.find((entry) => entry.key.includes(preferred))
      if (found) {
        return found.wallet
      }
    }

    return availableWallets[0]
  }

  const handleWalletButtonClick = async () => {
    console.log('[TopBar] wallet button clicked', {
      activeAddress,
      walletCount: wallets?.length ?? 0,
      isAutoConnecting,
    })

    if (isAutoConnecting) {
      console.log('[TopBar] already attempting to connect; click ignored')
      return
    }

    if (activeAddress) {
      console.log('[TopBar] wallet already connected; opening modal to manage accounts')
      toggleWalletModal()
      return
    }

    if (!wallets || wallets.length === 0) {
      console.warn('[TopBar] no wallet providers available; opening modal for fallback')
      toggleWalletModal()
      return
    }

    const targetWallet = pickAutoConnectWallet(wallets)
    console.log('[TopBar] attempting auto-connect with wallet', {
      id: targetWallet.id,
      name: targetWallet.metadata.name,
    })

    setIsAutoConnecting(true)
    try {
      await targetWallet.connect()
      console.log('[TopBar] auto-connect completed successfully')
    } catch (err) {
      console.error('[TopBar] auto-connect failed, opening modal for manual selection', err)
      toggleWalletModal()
    } finally {
      setIsAutoConnecting(false)
    }
  }

  // (Removed) ASA opt-in on connect

  return (
    <header className="TopBar">
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
        <a
          href="/"
          style={{
            marginRight: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            padding: '8px 0',
          }}
        >
          <img
            src="/Immages/LogoCropped.png"
            alt="Bount3 logo"
            style={{ height: '100%', width: 'auto', display: 'block', maxHeight: '59px', borderRadius: '8px' }}
          />
        </a>
        <a className="TopBarButton" href="/">
          Public campaigns
        </a>
        <a className="TopBarButton" href="/your-campaigns">
          Your campaigns
        </a>
        <button className="TopBarButton" data-test-id="connect-wallet" onClick={handleWalletButtonClick} disabled={isAutoConnecting}>
          {isAutoConnecting ? 'Connecting...' : activeAddress ? `Manage ${ellipseAddress(activeAddress)}` : 'Connect Wallet'}
        </button>
        <a className="TopBarButton" href="/contact">
          About and Contact
        </a>
      </nav>

      {/* ConnectWallet modal rendered inline to reuse its functionality */}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </header>
  )
}
