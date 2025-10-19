Bount3: Trustless payment system for collecting data

Bount3 uses a combination of smart contracts, on-chain box storage and NFTs to create an easy-to-use, trustless, decentralised system so that users can earn for the data they can share.

## Summary (<=150 chars)

Decentralized data bounties on Algorand: create campaigns, submit data, verify, and get paid trustlessly in Algo and BOUNT.

## Full description

Organizations and researchers need real-world data, but current collection methods are slow, opaque, and centralized. Bount3 lets anyone create on-chain “bounty” campaigns for specific data (images, text, files). Contributors submit to IPFS, reviewers verify, and rewards are paid automatically by smart contracts. This ensures transparent rules, fair payouts, and an auditable trail, with no need to trust a centralized intermediary.

## Demo video

Watch: https://youtu.be/ws24FTdSk3o

Walkthrough with audio (repo tour, architecture, and full demo)

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

- `mint_coin()` – Deploys a new Algorand Standard Asset (ASA) called “BOUNT” managed by the contract. This token is used for campaign rewards. Only callable by the contract itself; stores the asset ID for later use.

- `createCampaign(IPFSHash, payTxn, depositAmount, feeAmount, goalSubmissions, paidAmount)` – Creates a new campaign. The creator escrows funds (Algo and BOUNT) in the contract, specifying the IPFS hash for metadata, deposit for refunds, and the number of required submissions. The contract calculates the per-person payout and stores all campaign details on-chain. Emits a log for frontend indexing.

- `sendSubmission(IPFSHash, campaignHash)` – Allows a user to submit data to a campaign. The submission’s metadata is stored on IPFS, and the contract records the submission’s hash, creator, and status. Emits a log for tracking.

- `verifySubmission(submissionHash)` – Called by a campaign reviewer to mark a submission as verified. The contract updates the submission and campaign state, then pays the submitter both Algo and BOUNT tokens using inner transactions. Ensures only pending submissions are processed and that the campaign has not reached its goal. Emits a log for frontend updates.

- `declineSubmission(submissionHash)` – Marks a submission as declined (not eligible for reward). Updates the submission’s status and emits a log. No funds are transferred.

- `closeCampaign(campaignHash)` – Allows the campaign creator to close their campaign. Refunds any unspent deposit (Algo) to the creator, deletes the campaign’s on-chain storage, and emits a closure log. Only the original creator can close their campaign.

- `optInAsset()` – Lets a user opt in to the BOUNT ASA by sending a zero-amount transfer from the contract to the user. Required for users to receive BOUNT rewards.

Emitted logs:
- `campaign_created:<creator>:<ipfs>`
- `submission_created:<campaignHash>:<ipfs>:<creator>`
- `submission_verified:<submissionHash>:<receiver>`
- `submission_declined:<submissionHash>:<creator>`
- `campaign_closed:<campaignHash>:<creator>`

Block explorer? https://lora.algokit.io/localnet
