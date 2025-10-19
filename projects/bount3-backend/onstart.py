from algokit_utils.algorand import AlgorandClient
algorand = AlgorandClient.default_localnet()  # Or use .from_environment(), .testnet(), etc.
from algokit_utils import Account, SigningAccount
from algokit_utils.models.amount import AlgoAmount
account = algorand.account.random()
dispenser = algorand.account.localnet_dispenser()
algorand.account.ensure_funded(
    account,
    dispenser,
    AlgoAmount(algo=1000)  # or whatever minimum balance you want
)
algorand.account.set_signer(account.address, account.signer)

from algokit_utils.transactions.transaction_composer import AssetCreateParams

params = AssetCreateParams(
    sender=account.address,
    total=999_999_999_999_999_999,
    decimals=6,
    default_frozen=False,
    unit_name="BOUNT",
    asset_name="Bount3 Coin",
    manager=account.address,
    reserve=account.address,
    freeze=account.address,
    clawback=account.address,
)

result = algorand.send.asset_create(params)
print("Created ASA with ID:", result.asset_id)
