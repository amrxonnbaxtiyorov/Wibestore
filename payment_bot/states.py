"""Payment Bot — FSM States."""

from aiogram.fsm.state import State, StatesGroup


class VerificationStates(StatesGroup):
    """Seller verification flow states."""
    waiting_passport_front = State()   # Passport/ID old tomoni + F.I.SH caption
    waiting_passport_back = State()    # Passport/ID orqa tomoni
    waiting_video = State()            # Doira video (video_note)
    waiting_location = State()         # Live location


class WithdrawalStates(StatesGroup):
    """Withdrawal request flow states."""
    waiting_amount = State()           # Pul miqdori
    waiting_card = State()             # Karta raqami
    waiting_confirm = State()          # Tasdiqlash


class DepositStates(StatesGroup):
    """Deposit flow states."""
    waiting_amount = State()           # Summa
    waiting_screenshot = State()       # To'lov cheki rasmi
