// src/Home.tsx
import React from 'react'
// React Router: used to add client-side routing for the converted pages
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

/*
  NOTE about imports/exports:
  - We import page components below (TopBar, MainPage, etc.). Each file exports a React component as a default export.
  - The comment blocks near those imports in the new files explain what each exported function/component does.
*/
import CampaignViewer from './pages/CampaignViewer'
import ContactUs from './pages/ContactUs'
import CreateCampaign from './pages/CreateCampaign'
import MainPage from './pages/MainPage'
import TopBar from './pages/TopBar'
import VerifyCampaign from './pages/VerifyCampaign'
import YourCampaigns from './pages/YourCampaigns'

const Home: React.FC = () => {
  return (
    <Router>
      <div>
        {/* TopBar contains navigation links to the pages. */}
        <TopBar />

        {/*
          Routes for the converted pages. Each Route maps a path to a React component.
          - `/` shows the public campaigns (MainPage)
          - `/campaign/cid/:cid` shows CampaignViewer which reads the `cid` param and loads from backend/IPFS
          - `/campaign/verify/:cid` shows VerifyCampaign with pending submissions for the campaign
          - `/campaign/:title` shows CampaignViewer which reads the `title` param (legacy static cards)
          - `/create` shows the form to create a campaign
          - `/your-campaigns` shows user's campaigns
          - `/contact` shows contact page
        */}
        <main style={{ padding: 16 }}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/campaign/cid/:cid" element={<CampaignViewer />} />
            <Route path="/campaign/:title" element={<CampaignViewer />} />
            <Route path="/campaign/verify/:cid" element={<VerifyCampaign />} />
            <Route path="/create" element={<CreateCampaign />} />
            <Route path="/your-campaigns" element={<YourCampaigns />} />
            <Route path="/contact" element={<ContactUs />} />
            {/* A simple fallback link to quickly reach the create page */}
            <Route
              path="/help"
              element={
                <div>
                  <h2>Help / Shortcuts</h2>
                  <ul>
                    <li>
                      <Link to="/">Public campaigns (Main)</Link>
                    </li>
                    <li>
                      <Link to="/create">Create campaign</Link>
                    </li>
                  </ul>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default Home
