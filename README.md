Bount3: Trustless payment system for collecting data

Bount3 uses a combination of smart contracts, on-chain box storage and NFTs to create an easy-to-use, trustless, decentralised system so that users can earn for the data they can share.

## VIDEO

## IMAGES

![Create New Campaign](readmeassets/CreateNew.png)

![Your Campaigns](readmeassets/YourCampaigns.png)

![Public Campaigns](readmeassets/publicCampaigns.png)

![Submit Data](readmeassets/SubmitData.png)

The Smart Contract:
This handles all of the information writing and editing needed on-chain, as well as handling the custom ASA (BOUNT) and trustless transaction of Algos.

Functions:

    addSecret(bytes32 hashedSecret, string memory uri):
    Adds a new event secret and links it to an IPFS metadata URI. Enables infinite event expansion without redeployments.

    verifyAndMarkUsed(bytes32 hashedSecret, address user) returns (string):
    Verifies if the secret is valid, ensures the wallet has not used it yet, marks it as used, and returns the metadata URI for minting.

    hasUserMinted(bytes32 hashedSecret, address user):
    Read-only check to see if a wallet has already minted with a given secret.

Security:

    all transactions are trustless and documented on the blockchain publicaly
    the campaign organiser is prevented from taking the data without paying the contributor with a system of partial information withholding like watermarks in video, audio and immages. partial withholding of a part of text file formats when possible

###############################################################################################################
Security:

    Secret words are hashed off-chain (SHA-256 or similar) before storage.
    No plain-text secrets are stored on-chain, preventing scanning/cheating.

Scalability:

    New secret codes can be added anytime by calling addSecret(), supporting continuous event launches without new contract deployments.

🛠 Contract 2: SecretPOAPNFT.sol
Purpose:

Handles the minting and management of ERC-721 digital collectibles.
Key Functions:

    mint(address to, string memory uri):
    Mints a new NFT to a user with the provided IPFS metadata URI.

    updateMinter(address newMinter):
    Restricts minting rights to the Router contract after initial deployment.

Security:

    Initially, the deployer had minting rights.
    After deployment, mint rights are transferred to the Router contract using updateMinter().
    Prevents unauthorized NFT minting.

Minimalist Design:

    Focused only on minting and ownership functions to stay gas-efficient and within Polkadot's 49 KB limit.

🛠 Contract 3: SecretPOAPRouter.sol
Purpose:

Handles user interactions and mint flow logic.
Key Functions:

    mintWithSecret(string memory secretWord):
    Accepts user input, hashes it, verifies it with the Manager, and mints an NFT if valid.

    setSecretCodeManager(address _manager):
    Updates the SecretCodeManager address (admin-only).

    setNFTContract(address _nft):
    Updates the NFT contract address (admin-only).

Security:

    Only allows minting if the secret is verified and unused for the wallet.
    Central controller ensuring users can't bypass security and mint directly.

🔒 Key Security Features

    Hashed Secrets:
    Secrets are never exposed on-chain. Users must genuinely know the correct secret to mint.

    Single-Use Protection:
    Each wallet can only mint once per secret.

    Upgradeable System:
    Admins can update Secret Manager or NFT contract addresses without redeploying the entire Router.

    Only Authorized Minting:
    NFT contract only accepts minting calls from the authorized Router.

🔗 System Interaction Flow

    User connects wallet and submits a secret word on the frontend.
    Frontend hashes the secret word.
    Router calls verifyAndMarkUsed() on Manager:
        Verifies the secret.
        Marks the secret as used for that wallet.
        Fetches the associated metadata URI.
    Router calls mint() on the NFT contract:
        NFT is minted with the returned metadata.
    User receives the collectible in their wallet.

✅ Final Summary

This smart contract architecture ensures that:

    Only real event attendees can mint their POAPs.
    Secrets are protected on-chain.
    Mass minting scales smoothly with Polkadot's Elastic Coretime.
    New events can be added without disruption.

Blocklink : https://blockscout-asset-hub.parity-chains-scw.parity.io/address/0x16E5BA2A5713E036B2dd10BA1c5861728FAb6D23?tab=contract

Website has been published at : https://mahir-pa.github.io/poap

Presentation slides : https://www.canva.com/design/DAGlwOQ7U-k/3AZU1fcIiz6qfhmwpOQ-Hw/edit?utm_content=DAGlwOQ7U-k&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

Twitter thread : https://x.com/pramay07_/status/1916258393859248542