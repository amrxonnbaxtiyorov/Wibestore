from pydantic import BaseModel, Field


class SubmitTopUpRequest(BaseModel):
    """Payload from Web App; telegram_id comes from validated initData."""

    currency: str = Field(..., pattern="^(UZS|USDT)$")
    payment_method: str = Field(..., min_length=1, max_length=50)
    amount: float = Field(..., gt=0)
    # receipt is uploaded as multipart; handled separately
