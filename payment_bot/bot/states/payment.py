"""
FSM holatlari — to'lov oqimi uchun.
"""
from aiogram.fsm.state import State, StatesGroup


class PaymentFlow(StatesGroup):
    # 1. Foydalanuvchi to'lov turini tanlaydi (HUMO yoki VISA/MC)
    choosing_type = State()

    # 2. Bot karta rekvizitlarini ko'rsatdi, chek kutilmoqda
    waiting_receipt = State()
