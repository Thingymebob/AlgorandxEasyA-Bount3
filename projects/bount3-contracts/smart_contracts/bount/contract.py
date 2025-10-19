from algopy import ARC4Contract, Account, Global, Txn, UInt64, Bytes, gtxn, itxn, log, String, Struct, BoxMap, subroutine
from algopy.arc4 import abimethod


# === STRUCTS ===
class Campaign(Struct):
    creator: Account
    IPFSHash: Bytes
    status: Bytes
    depositAmount: UInt64
    payPerPerson: UInt64
    goalSubmissions: UInt64
    verifiedSubmissions: UInt64


class Submission(Struct):
    creator: Account
    IPFSHash: Bytes
    status: Bytes
    campaignHash: Bytes


# === CONTRACT ===
class Bount3(ARC4Contract):
    def __init__(self) -> None:
        self.amount_earned = UInt64(0)  # platform address
        self.campaigns = BoxMap(Bytes, Campaign)
        self.submissions = BoxMap(Bytes, Submission)
        self.asset_id = UInt64(0)
    # === MINT BOUNT COIN ===
    @abimethod
    def mint_coin(self) -> String:
        app_addr = Global.current_application_address
        total_supply = UInt64(999_999_999_999_999_999)

        itxn_result = itxn.AssetConfig(
            total=total_supply,
            decimals=UInt64(6),
            default_frozen=False,
            unit_name=Bytes(b"BOUNT"),
            asset_name=Bytes(b"Bount3 Coin"),
            manager=app_addr,
            reserve=app_addr,
            freeze=app_addr,
            clawback=app_addr,
            fee=UInt64(0),
        ).submit()

        created_id = itxn_result.created_asset
        self.asset_id = created_id.id
        log(Bytes(b"minted_asset"))
        return String("Success")
    # === CREATE CAMPAIGN ===
    @abimethod()
    def createCampaign(
        self,
        IPFSHash: Bytes,
        payTxn: gtxn.PaymentTransaction,
        depositAmount: UInt64,
        feeAmount: UInt64,
        goalSubmissions: UInt64,
        paidAmount: UInt64,
    ) -> Bytes:
        sender = Txn.sender

        assert payTxn.receiver == Global.current_application_address, "Invalid receiver"
        required_payment = paidAmount + feeAmount + depositAmount
        assert payTxn.amount == required_payment, "Incorrect payment amount"

        payPerPerson = (paidAmount) // goalSubmissions
        # Store campaign using IPFS hash as unique key
        self.campaigns[IPFSHash] = Campaign(
            creator=sender,
            IPFSHash=IPFSHash,
            status=Bytes(b"Pending"),
            depositAmount=depositAmount,
            payPerPerson=payPerPerson,
            goalSubmissions=goalSubmissions,
            verifiedSubmissions=UInt64(0),
        )

        log(Bytes(b"campaign_created:") + sender.bytes + Bytes(b":") + IPFSHash)
        return IPFSHash

    # === SEND SUBMISSION ===
    @abimethod()
    def sendSubmission(self, IPFSHash: Bytes, campaignHash: Bytes) -> Bytes:
        sender = Txn.sender

        assert campaignHash in self.campaigns, "Campaign not found"

        self.submissions[IPFSHash] = Submission(
            creator=sender,
            IPFSHash=IPFSHash,
            status=Bytes(b"Pending"),
            campaignHash=campaignHash,
        )

        log(Bytes(b"submission_created:") + campaignHash + Bytes(b":") + IPFSHash + Bytes(b":") + sender.bytes)
        return IPFSHash

    # === VERIFY SUBMISSION ===
    @abimethod()
    def verifySubmission(self, submissionHash: Bytes) -> String:
        assert submissionHash in self.submissions, "Submission not found"
        submission = self.submissions[submissionHash].copy()
        campaign = self.campaigns[submission.campaignHash].copy()

        assert submission.status == Bytes(b"Pending"), "Already processed"
        assert campaign.verifiedSubmissions < campaign.goalSubmissions, "Campaign complete"

        # Update state
        submission.status = Bytes(b"Verified")
        campaign.verifiedSubmissions += UInt64(1)
        self.submissions[submissionHash] = submission.copy()
        self.campaigns[submission.campaignHash] = campaign.copy()

        receiver = submission.creator
        app_addr = Global.current_application_address

        # Pay Algo reward
        itxn.Payment(
            receiver=receiver,
            amount=campaign.payPerPerson,
            fee=UInt64(0),
        ).submit()

        # Pay BOUNT token reward
        itxn.AssetTransfer(
            xfer_asset=self.asset_id,
            asset_receiver=receiver,
            asset_amount=campaign.payPerPerson,
            fee=UInt64(0),
            sender=app_addr,
        ).submit()

        log(Bytes(b"submission_verified:") + submissionHash + Bytes(b":") + receiver.bytes)
        return String("Submission verified and rewarded")

    # === DECLINE SUBMISSION ===
    @abimethod()
    def declineSubmission(self, submissionHash: Bytes) -> String:
        assert submissionHash in self.submissions, "Submission not found"
        submission = self.submissions[submissionHash].copy()
        assert submission.status == Bytes(b"Pending"), "Already processed"

        submission.status = Bytes(b"Declined")
        self.submissions[submissionHash] = submission.copy()

        log(Bytes(b"submission_declined:") + submissionHash + Bytes(b":") + submission.creator.bytes)
        return String("Submission declined")

    # === CLOSE CAMPAIGN ===
    @abimethod()
    def closeCampaign(self, campaignHash: Bytes) -> String:
        assert campaignHash in self.campaigns, "Campaign not found"

        campaign = self.campaigns[campaignHash].copy()
        sender = Txn.sender

        # Only the campaign creator can close
        assert sender == campaign.creator, "Only creator can close the campaign"

        total_goal = campaign.goalSubmissions
        verified = campaign.verifiedSubmissions
        pay_per = campaign.payPerPerson

        # === Refund any remaining Algo ===
        # total amount that should have been paid out
        total_payout = verified * pay_per
        total_funded = campaign.depositAmount

        # leftover = unspent deposit (Algo not used for rewards)
        assert total_funded >= total_payout, "Invalid campaign accounting"
        refund_amount = total_funded - total_payout

        if refund_amount > UInt64(0):
            itxn.Payment(
                receiver=sender,
                amount=refund_amount,
                fee=UInt64(0),
            ).submit()

        # === Delete campaign storage ===
        del self.campaigns[campaignHash]

        # === Emit closure log ===
        log(Bytes(b"campaign_closed:") + campaignHash + Bytes(b":") + sender.bytes)

        return String("Campaign closed and refund processed")
    #opt into coin
    @abimethod()
    def optInAsset(self) -> String:
        sender = Txn.sender
        itxn.AssetTransfer(
            xfer_asset=self.asset_id,
            asset_receiver=sender,
            asset_amount=UInt64(0),
            fee=UInt64(0)
        ).submit()
        return String("Opt-in complete")
