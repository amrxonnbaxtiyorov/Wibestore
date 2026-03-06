# Telegram Bot — Railway build xatosi va yechimi

## Log'dagi xato

```
mise ERROR Failed to install core:python@3.12.13: no precompiled python found for core:python@3.12.13 on x86_64-unknown-linux-gnu
ERROR: failed to build: failed to solve: process "mise install" did not complete successfully: exit code: 1
```

**Sabab:** Railway (Railpack) loyihani Python loyiha deb aniqlaydi va `mise` orqali `runtime.txt` dagi Python versiyasini o'rnatishga urinadi. Ba'zi versiyalar (masalan 3.12.13) uchun platformada precompiled binary bo'lmasa, build ishlamaydi.

---

## Yechim 1: Dockerfile orqali deploy (tavsiya etiladi)

Railway'da bu servis uchun **Root Directory** ni `telegram_bot` qiling va **Dockerfile** dan build qiling (Railpack ishlatilmasin).

1. Railway Dashboard → Telegram Bot servisi → **Settings**.
2. **Root Directory:** `telegram_bot` (yoki `./telegram_bot`).
3. **Build:** Builder ni **Dockerfile** qiling (agar "Nixpacks" / "Railpack" bo'lsa, o'zgartiring — Dockerfile mavjud bo'lsa Railway uni tanlaydi).
4. **Dockerfile path:** `Dockerfile` (root directory ichida, ya'ni `telegram_bot/Dockerfile`).
5. **Redeploy.**

Shunda build `python:3.11-slim` image dan ishlaydi, `mise` ishlatilmaydi va xato ketadi.

---

## Yechim 2: Faqat Railpack ishlatilsa (runtime.txt)

Agar servis root'i **butun repo** (yoki Railpack Python tanlayapti) bo'lsa:

- `telegram_bot/runtime.txt` da **3.11** yozilgan bo'lishi kerak (3.12 emas).  
- Log'da 3.12.13 ko'rinsa, ehtimol root boshqa joyda yoki eski build — **Root Directory** ni `telegram_bot` qilib, **Dockerfile** bilan build qiling (yuqoridagi qadamlar).

---

## Qisqacha

| Muammo | Railpack/mise Python 3.12.13 ni o'rnatolmayapti (no precompiled). |
| Yechim | Telegram Bot uchun Root Directory = `telegram_bot`, build = **Dockerfile**. |
