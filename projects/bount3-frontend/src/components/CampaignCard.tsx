import type { Campaign } from '../utils/parseCardText'

/* CampaignCard.tsx
   - Default export: CampaignCard component that renders a simple clickable card.
   - Props: { campaign: Campaign }
   - Image placeholder: uses the campaign.logo if provided, otherwise a placeholder path '/placeholders/logo.png'.
   - Import/Export note: This file exports a default React component. Import in pages with:
       import CampaignCard from '../components/CampaignCard'
*/

export default function CampaignCard({
  campaign,
  href,
}: {
  campaign: Campaign
  // optional href override; if omitted the card links to /campaign/<title>
  href?: string
}) {
  // Ensure we show images from the project's images folder by default.
  // Place image files under public/Immages/ (note the spelling matches the original).
  const logo = campaign.logo || '/Immages/logo.png'
  // Prefer linking by CID when available so the detail page can fetch the correct metadata from backend
  // Default behavior: go to verify page when CID exists; else fall back to title-based viewer
  const target =
    href ?? (campaign.cid ? `/campaign/verify/${encodeURIComponent(campaign.cid)}` : `/campaign/${encodeURIComponent(campaign.title)}`)
  return (
    <a className="OptionCard" href={target}>
      <img className="OptionImage" src={logo} alt={`${campaign.title} image`} />
      <div className="OptionInfoTop">
        <h2>{campaign.title}</h2>
      </div>
      <div className="OptionInfoBottom">
        <h4>{campaign.organisation}</h4>
        <p>{campaign.shortDescription}</p>
        {campaign.algoPaid && (
          <p style={{ marginTop: 6, opacity: 0.9 }}>
            Reward per submission: <strong>{campaign.algoPaid}</strong>
          </p>
        )}
      </div>
    </a>
  )
}
