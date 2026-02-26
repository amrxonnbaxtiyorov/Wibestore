"""
WibeStore Backend - Constants
"""

# ============================================================
# USER
# ============================================================
LANGUAGE_CHOICES = [
    ("uz", "O'zbekcha"),
    ("ru", "Русский"),
    ("en", "English"),
]

# ============================================================
# LISTING
# ============================================================
LISTING_STATUS_CHOICES = [
    ("pending", "Pending Moderation"),
    ("active", "Active"),
    ("sold", "Sold"),
    ("blocked", "Blocked"),
    ("archived", "Archived"),
    ("rejected", "Rejected"),
]

LOGIN_METHOD_CHOICES = [
    ("email", "Email"),
    ("phone", "Phone"),
    ("username", "Username"),
    ("social", "Social Media"),
]

# ============================================================
# TRANSACTIONS
# ============================================================
TRANSACTION_TYPE_CHOICES = [
    ("deposit", "Deposit"),
    ("withdrawal", "Withdrawal"),
    ("purchase", "Purchase"),
    ("refund", "Refund"),
    ("commission", "Commission"),
    ("subscription", "Subscription"),
]

TRANSACTION_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("processing", "Processing"),
    ("completed", "Completed"),
    ("failed", "Failed"),
    ("cancelled", "Cancelled"),
]

# ============================================================
# ESCROW
# ============================================================
ESCROW_STATUS_CHOICES = [
    ("pending_payment", "Pending Payment"),
    ("paid", "Paid"),
    ("delivered", "Delivered"),
    ("confirmed", "Confirmed"),
    ("disputed", "Disputed"),
    ("refunded", "Refunded"),
]

# ============================================================
# SUBSCRIPTION
# ============================================================
SUBSCRIPTION_STATUS_CHOICES = [
    ("active", "Active"),
    ("cancelled", "Cancelled"),
    ("expired", "Expired"),
]

# ============================================================
# MESSAGE
# ============================================================
MESSAGE_TYPE_CHOICES = [
    ("text", "Text"),
    ("image", "Image"),
    ("file", "File"),
    ("system", "System"),
]

# ============================================================
# REPORT
# ============================================================
REPORT_REASON_CHOICES = [
    ("scam", "Scam / Fraud"),
    ("false_info", "False Information"),
    ("inappropriate", "Inappropriate Content"),
    ("other", "Other"),
]

REPORT_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("investigating", "Under Investigation"),
    ("resolved", "Resolved"),
    ("rejected", "Rejected"),
]

# ============================================================
# PAYMENT METHODS (Google Pay, Visa, Mastercard, Apple Pay)
# ============================================================
PAYMENT_METHOD_CHOICES = [
    ("google_pay", "Google Pay"),
    ("visa", "Visa Card"),
    ("mastercard", "Mastercard"),
    ("apple_pay", "Apple Pay"),
]

# ============================================================
# DEFAULT COMMISSION RATE
# ============================================================
DEFAULT_COMMISSION_RATE = 0.10

# ============================================================
# ESCROW TIMEOUT (hours)
# ============================================================
ESCROW_AUTO_RELEASE_HOURS = 24
ESCROW_DISPUTE_WINDOW_HOURS = 48

# ============================================================
# MODERATION TIMEOUT (hours)
# ============================================================
MODERATION_AUTO_APPROVE_HOURS = 48

# ============================================================
# IMAGE UPLOAD SETTINGS
# ============================================================
IMAGE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024  # 5MB
IMAGE_UPLOAD_MAX_WIDTH = 1920
IMAGE_UPLOAD_MAX_HEIGHT = 1080
IMAGE_UPLOAD_MAX_FILES = 5
IMAGE_UPLOAD_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
