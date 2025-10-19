Bount3: Trustless payment system for collecting data

Bount3 uses a combination of smart contracts, on-chain box storage and NFTs to create an easy-to-use, trustless, decentralised system so that users can earn for the data they can share.

## VIDEO

Demo video: (https://youtu.be/ws24FTdSk3o)

## IMAGES

<p align="center">
    <img src="readmeassets/CreateNew.png" alt="Create New Campaign" width="49%" />
    <img src="readmeassets/YourCampaigns.png" alt="Your Campaigns" width="49%" />
    <br/>
    <img src="readmeassets/publicCampaigns.png" alt="Public Campaigns" width="49%" />
    <img src="readmeassets/SubmitData.png" alt="Submit Data" width="49%" />
    <br/>
    <sub>UI screenshots: Create, Your Campaigns, Public Campaigns, Submit Data</sub>

</p>

## Features

- Create, browse, and verify on-chain data bounty campaigns
- Trustless reward payouts in Algo and a platform token (BOUNT)
- IPFS integration for campaign and submission metadata via a FastAPI backend
- Wallet connect (Pera/Defly/WalletConnect) using @txnlab/use-wallet-react
- LocalNet-friendly setup using AlgoKit

## Repository structure

```
ROOT/
  README.md
  readmeassets/                  # Images for this README
  projects/
     bount3-frontend/            # React + Vite (TypeScript)
     bount3-backend/             # FastAPI service for IPFS (Pinata)
     bount3-contracts/           # Algorand smart contracts (algopy / ARC-4)
```

## Tech stack

- Frontend: React 18, Vite, TypeScript, Tailwind
- Wallet: @txnlab/use-wallet-react (+ Pera/Defly connectors)
- Contracts: algopy (ARC-4), AlgoKit utils
- Backend: FastAPI + requests (Pinata IPFS)

## Local development (AlgoKit LocalNet)

Prerequisites:
- Node 20+, npm 9+
- Python 3.12+
- Poetry (for contracts) and/or a venv
- Docker + AlgoKit (for LocalNet)

Steps:
Bount3: Trustless payment system for collecting data

Bount3 uses a combination of smart contracts, on-chain box storage and NFTs to create an easy-to-use, trustless, decentralised system so that users can earn for the data they can share.

## Summary (<=150 chars)

Decentralized data bounties on Algorand: create campaigns, submit data, verify, and get paid trustlessly in Algo and BOUNT.

## Full description

Organizations and researchers need real-world data, but current collection methods are slow, opaque, and centralized. Bount3 lets anyone create on-chain “bounty” campaigns for specific data (images, text, files). Contributors submit to IPFS, reviewers verify, and rewards are paid automatically by smart contracts. This ensures transparent rules, fair payouts, and an auditable trail, with no need to trust a centralized intermediary.

## Demo video

Watch: https://youtu.be/ws24FTdSk3o

Walkthrough with audio (repo tour, architecture, and full demo): [Add Loom/YouTube link]

## UI screenshots

<p align="center">
    <img src="readmeassets/CreateNew.png" alt="Create New Campaign" width="49%" />
    <img src="readmeassets/YourCampaigns.png" alt="Your Campaigns" width="49%" />
    <br/>
    <img src="readmeassets/publicCampaigns.png" alt="Public Campaigns" width="49%" />
    <img src="readmeassets/SubmitData.png" alt="Submit Data" width="49%" />
    <br/>
    <sub>UI screenshots: Create, Your Campaigns, Public Campaigns, Submit Data</sub>

</p>

## How we used Algorand

- ARC-4 smart contract manages campaigns and submissions using on-chain Box storage
- Trustless payouts in Algo and a custom ASA (BOUNT) via inner transactions
- Deterministic, parseable event logs (campaign/submission lifecycle) used by the frontend
- LocalNet via AlgoKit for rapid iteration; easy promotion to TestNet/MainNet

## Technical description

- Smart contracts: algopy (ARC-4), inner Txns (Payment + AssetTransfer), BoxMap for state
- Frontend: React + Vite + TypeScript, @txnlab/use-wallet-react (Pera/Defly/WalletConnect)
- Backend: FastAPI proxy to Pinata (IPFS) for metadata and optional files
- Indexing: lightweight, using Indexer endpoints from LocalNet; frontend parses on-chain logs
- Theming: dynamic accent color from campaign logo via canvas sampling (UX detail)

## Smart contracts overview

Contract `Bount3` (algopy ARC-4):
- `mint_coin()` – Create ASA “BOUNT” managed by the app
- `createCampaign(IPFSHash, payTxn, depositAmount, feeAmount, goalSubmissions, paidAmount)` – Create a campaign, escrow funds, compute pay per person
- `sendSubmission(IPFSHash, campaignHash)` – Submit to a campaign
- `verifySubmission(submissionHash)` – Mark verified and pay Algo + BOUNT to the submitter
- `declineSubmission(submissionHash)` – Mark declined
- `closeCampaign(campaignHash)` – Refund remaining deposit to creator and remove storage
- `optInAsset()` – Opt-in helper via zero-amount transfer

Emitted logs:
- `campaign_created:<creator>:<ipfs>`
- `submission_created:<campaignHash>:<ipfs>:<creator>`
- `submission_verified:<submissionHash>:<receiver>`
- `submission_declined:<submissionHash>:<creator>`
- `campaign_closed:<campaignHash>:<creator>`

## Repository structure

```
ROOT/
  README.md
  readmeassets/                  # Images for this README
  projects/
    bount3-frontend/            # React + Vite (TypeScript)
    bount3-backend/             # FastAPI service for IPFS (Pinata)
    bount3-contracts/           # Algorand smart contracts (algopy / ARC-4)
```

## Local development (AlgoKit LocalNet)

Prerequisites:
- Node 20+, npm 9+
- Python 3.12+
- Poetry (for contracts) and/or a venv
- Docker + AlgoKit (for LocalNet)

Steps:
1) Start LocalNet (root): VS Code Task “Start AlgoKit LocalNet” or `algokit localnet start`
2) Frontend: `cd projects/bount3-frontend && npm install && npm run dev`
3) Backend: `cd projects/bount3-backend && pip install -r requirements.txt && uvicorn backend:app --reload`
   - Set `.env` with `PINATA_JWT=<token>`
4) Contracts: `cd projects/bount3-contracts && poetry install && poetry run python -m smart_contracts build`

## Environment configuration

Frontend `.env` (LocalNet defaults):
- `VITE_ALGOD_SERVER=http://localhost`, `VITE_ALGOD_PORT=4001`, `VITE_ALGOD_NETWORK=localnet`
- `VITE_INDEXER_SERVER=http://localhost`, `VITE_INDEXER_PORT=8980`
- `VITE_BOUNT3_APP_ID=1002` (update if you deploy a new app)

Backend `.env`:
- `PINATA_JWT=<your pinata jwt>`

## Block explorer

- LocalNet (Lora): Transactions template available in code (`VITE_LORA_TX_URL_TEMPLATE`)
- TestNet/MainNet: After deploying, add your App ID and link, e.g.
  - TestNet: https://lora.algokit.io/testnet/application/APP_ID
  - MainNet: https://lora.algokit.io/mainnet/application/APP_ID

## Team & slides

- Slides (Canva): https://www.canva.com/design/DAGlwOQ7U-k/3AZU1fcIiz6qfhmwpOQ-Hw
- Short team intro: add a “Team” slide (names, roles, institution)

## Judging checklist mapping

- Innovation & Originality: Open, on-chain bounty marketplace with verifiable payouts
- Usability & Design: Simple flows (create, submit, verify), responsive UI, clear cards
- Impact Potential: General-purpose data collection for research, ML, and civic apps
- Feasibility: Working LocalNet prototype with clear path to TestNet/MainNet
- Use of Blockchain: ARC-4 contract, inner txns, ASA payouts, event logs
- Technical Implementation: Custom contract (algopy), typed frontend, and backend/IPFS

## License

Open source. Feel free to fork and extend for your use case.
