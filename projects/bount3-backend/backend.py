from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
import os
import json
from typing import Optional

load_dotenv()

PINATA_JWT = os.getenv("PINATA_JWT")
PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"

app = FastAPI(title="Bounty Platform Backend")
submitted_hashes = []
# Allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload_to_ipfs")
async def upload_to_ipfs(
    title: str = Form(...),
    description: str = Form(...),
    file: Optional[UploadFile] = File(None),
):
    """
    Upload metadata (and optional file) to IPFS using Pinata.
    Returns the folder CID.
    """
    # ---- Create metadata.json ----
    metadata = {"title": title, "description": description}
    metadata_bytes = json.dumps(metadata, indent=2).encode()

    files = [
        ("file", ("metadata.json", metadata_bytes, "application/json")),
    ]

    if file:
        files.append(("file", (file.filename, await file.read(), file.content_type)))

    headers = {"Authorization": f"Bearer {PINATA_JWT}"}
    # Ensure we always get a directory CID even if there's only one file
    # so that /<cid>/metadata.json resolves predictably
    data = {"pinataOptions": json.dumps({"wrapWithDirectory": True})}
    response = requests.post(PINATA_URL, files=files, data=data, headers=headers)

    if response.status_code != 200:
        return {"error": f"Upload failed: {response.text}"}

    result = response.json()
    return {"cid": result["IpfsHash"]}

@app.get("/fetch_metadata/{cid}")
def fetch_metadata(cid: str):
    """
    Fetch metadata for a campaign from IPFS via Pinata gateway.
    Tries folder-style (/cid/metadata.json) first, then falls back to single-file (/cid).
    """
    base = f"https://gateway.pinata.cloud/ipfs/{cid}"
    # Try folder pattern first
    url_folder = f"{base}/metadata.json"
    r1 = requests.get(url_folder)
    if r1.status_code == 200:
        try:
            return r1.json()
        except Exception:
            return {"error": "Fetched folder metadata is not valid JSON", "cid": cid}

    # Fallback: CID might point directly to the metadata.json file
    url_file = base
    r2 = requests.get(url_file)
    if r2.status_code == 200:
        try:
            return r2.json()
        except Exception:
            return {"error": "Fetched file content is not valid JSON", "cid": cid}

    # If both fail, return combined error
    return {
        "error": (
            f"Could not fetch metadata: folder={r1.status_code} {r1.text[:200]} | file={r2.status_code} {r2.text[:200]}"
        ),
        "cid": cid,
    }
