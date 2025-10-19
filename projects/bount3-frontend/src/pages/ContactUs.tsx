/* ContactUs.tsx
   - Default export: ContactUs
   - Contact and about information page with dummy content
*/
export default function ContactUs() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ marginTop: 0, color: '#fff' }}>About Bount3</h1>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
          Bount3 is a decentralized data bounty platform built on Algorand blockchain. We connect organizations seeking high-quality data
          with contributors around the world, enabling transparent, secure, and fair data collection campaigns.
        </p>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
          Whether you need images for machine learning, survey responses, audio samples, or any other data type, Bount3 makes it simple to
          create campaigns, receive submissions, and reward contributors—all powered by smart contracts and IPFS.
        </p>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, color: '#fff' }}>Contact Information</h2>
        <div style={{ display: 'grid', gap: '1.5rem', fontSize: '1.05rem' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'rgba(255, 157, 0, 0.9)' }}>Email</h3>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)' }}>
              <a href="mailto:hello@bount3.example" style={{ color: '#4da6ff', textDecoration: 'none' }}>
                hello@bount3.example
              </a>
            </p>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)' }}>
              <a href="mailto:support@bount3.example" style={{ color: '#4da6ff', textDecoration: 'none' }}>
                support@bount3.example
              </a>
            </p>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'rgba(255, 157, 0, 0.9)' }}>Social Media</h3>
            <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.85)' }}>
              <strong>Twitter:</strong>{' '}
              <a
                href="https://twitter.com/bount3"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4da6ff', textDecoration: 'none' }}
              >
                @bount3
              </a>
            </p>
            <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.85)' }}>
              <strong>Discord:</strong>{' '}
              <a
                href="https://discord.gg/bount3"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4da6ff', textDecoration: 'none' }}
              >
                discord.gg/bount3
              </a>
            </p>
            <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.85)' }}>
              <strong>GitHub:</strong>{' '}
              <a
                href="https://github.com/bount3"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4da6ff', textDecoration: 'none' }}
              >
                github.com/bount3
              </a>
            </p>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'rgba(255, 157, 0, 0.9)' }}>Documentation</h3>
            <p style={{ margin: '0.25rem 0', color: 'rgba(255, 255, 255, 0.85)' }}>
              <a
                href="https://docs.bount3.example"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4da6ff', textDecoration: 'none' }}
              >
                docs.bount3.example
              </a>
            </p>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'rgba(255, 157, 0, 0.9)' }}>Office Location</h3>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
              123 Blockchain Avenue
              <br />
              Suite 456
              <br />
              Decentralized City, DC 78910
              <br />
              United States
            </p>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '2rem' }}>
        <h2 style={{ marginTop: 0, color: '#fff' }}>Get Involved</h2>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
          We're always looking for passionate contributors, campaign creators, and community members. Whether you want to submit data to
          campaigns, create your own bounties, or contribute to the platform development, we'd love to hear from you!
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <a href="/" className="TopBarButton" style={{ display: 'inline-block', marginRight: '1rem', textDecoration: 'none' }}>
            Browse Campaigns
          </a>
          <a href="/create" className="TopBarButton" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Create a Campaign
          </a>
        </div>
      </div>
    </div>
  )
}
