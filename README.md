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
1) Start LocalNet (from the root workspace)
    - VS Code Task: “Start AlgoKit LocalNet”; or run `algokit localnet start`.
2) Frontend
    - cd `projects/bount3-frontend`
    - Configure `.env` (LocalNet defaults are already present)
    - `npm install`
    - `npm run dev`
3) Backend
    - cd `projects/bount3-backend`
    - Create `.env` with `PINATA_JWT=...` (Pinata Bearer token)
    - Install deps: `pip install -r requirements.txt`
    - Run: `uvicorn backend:app --reload`
4) Contracts
    - cd `projects/bount3-contracts`
    - Install deps: `poetry install`
    - Build: `poetry run python -m smart_contracts build`

## Environment configuration

Frontend `.env` (LocalNet defaults):
- `VITE_ALGOD_SERVER=http://localhost`, `VITE_ALGOD_PORT=4001`, `VITE_ALGOD_NETWORK=localnet`
- `VITE_INDEXER_SERVER=http://localhost`, `VITE_INDEXER_PORT=8980`
- `VITE_BOUNT3_APP_ID=1002` (update if you deploy a new app)

Backend `.env`:
- `PINATA_JWT=<your pinata jwt>`

## Smart contracts overview

Contract: `Bount3` (algopy ARC-4)
- `mint_coin()` – Create ASA “BOUNT” managed by the app
- `createCampaign(IPFSHash, payTxn, depositAmount, feeAmount, goalSubmissions, paidAmount)` – Create a campaign, escrow funds, compute pay per person
- `sendSubmission(IPFSHash, campaignHash)` – Submit to a campaign
- `verifySubmission(submissionHash)` – Mark verified and pay Algo + BOUNT to the submitter
- `declineSubmission(submissionHash)` – Mark declined
- `closeCampaign(campaignHash)` – Refund remaining deposit to creator and remove storage
- `optInAsset()` – App sends zero-amount transfer so the sender opts in to BOUNT

Emitted logs (parsed by the frontend):
- `campaign_created:<creator>:<ipfs>`
- `submission_created:<campaignHash>:<ipfs>:<creator>`
- `submission_verified:<submissionHash>:<receiver>`
- `submission_declined:<submissionHash>:<creator>`
- `campaign_closed:<campaignHash>:<creator>`

## Troubleshooting

- Video files larger than 100 MB cannot be stored in the repo on GitHub. Host externally and link in the README.
- If LocalNet endpoints fail, ensure AlgoKit LocalNet is running and ports match `.env`.
- For Pinata uploads, verify your `PINATA_JWT` and that the backend is reachable from the frontend.

## Links

- Presentation slides: https://www.canva.com/design/DAGlwOQ7U-k/3AZU1fcIiz6qfhmwpOQ-Hw
- Twitter thread: https://x.com/pramay07_/status/1916258393859248542
