/**
 * Sotuvchi va xaridor qoidalari (FunPay uslubida). Har safar akkaunt sotish/sotib olishda o'qish + test majburiy.
 * Quiz: 5 ta tasodifiy savol, barchasi to'g'ri bo'lishi kerak.
 */


/** Qoidalar bo'limlari (uz, ru, en) */
export const sellerRulesSectionsUz = [
  {
    title: '1. Umumiy qoidalar',
    titleRu: '1. Общие правила',
    items: [
      'Boshqa foydalanuvchilarga kontakt ma\'lumotlaringizni (Telegram, Discord, telefon va b.) berish taqiqlanadi. Faqat WibeStore ichidagi chat orqali muloqot.',
      'To\'lov faqat WibeStore orqali (Escrow). Sotuvchi yoki xaridorga to\'g\'ridan-to\'g\'ri pul o\'tkazish yoki platformadan tashqarida to\'lov talab qilish taqiqlanadi.',
      'Reyting tizimini noto\'g\'ri ishlatish (nakrutka, shantaj, asossiz bad review) taqiqlanadi.',
      'Uchinchi shaxsga boshqa foydalanuvchi haqida ma\'lumot berish yoki zarar yetkazish maqsadida ma\'lumot tarqatish taqiqlanadi.',
      'WibeStore akkauntini sotish yoki sotib olish urinishi taqiqlanadi.',
      'Firibgarlik, aldash va ataylab zarar yetkazish — barcha akkauntlar bloklanadi va to\'lovlar rad etiladi.',
    ],
    itemsRu: [
      'Запрещено передавать контакты (Telegram, Discord, телефон и т.д.) другим пользователям. Общение только через чат WibeStore.',
      'Оплата только через WibeStore (Escrow). Запрещены переводы напрямую продавцу/покупателю и оплата вне платформы.',
      'Запрещено злоупотребление рейтингом (накрутка, шантаж, необоснованные негативные отзывы).',
      'Запрещено передавать третьим лицам данные других пользователей с целью причинения вреда.',
      'Запрещена попытка продажи или покупки аккаунта WibeStore.',
      'Мошенничество, обман и умышленный вред — блокировка аккаунтов и отказ в выплатах.',
    ],
  },
  {
    title: '2. Sotuvchilar uchun taqiqlar',
    titleRu: '2. Запреты для продавцов',
    items: [
      'Tovarni Escrow orqali to\'lovsiz berish yoki platformadan tashqarida savdo qilish taqiqlanadi.',
      'Xaridordan buyurtma bajarilishidan oldin tasdiqlashni so\'rash (aldov belgilari bo\'lmasa) taqiqlanadi.',
      'Raqobatchilarga qarshi noto\'g\'ri harakatlar (yomon reyting uchun xarid qilish, asossiz shikoyatlar) taqiqlanadi.',
      'Xaridorlarning savollarini asossiz e\'tiborsiz qoldirish taqiqlanadi.',
      'Noto\'g\'ri yoki ishlamaydigan takliflar, noto\'g\'ri narx bilan e\'lon berish taqiqlanadi.',
      'Boshqa platformalarda bir xil akkauntni reklama qilish (sotish maqsadida) taqiqlanadi; ijtimoiy tarmoqlarda reklama va do\'konlarga sotish ruxsat etiladi.',
      'Noyob yoki noqonuniy yo\'l bilan olingan mahsulotlarni sotish taqiqlanadi.',
    ],
    itemsRu: [
      'Запрещено отдавать товар без оплаты через Escrow или торговать вне платформы.',
      'Запрещено просить покупателя подтвердить заказ до выполнения (при отсутствии признаков мошенничества).',
      'Запрещены недобросовестные действия против конкурентов (покупка для плохих отзывов, необоснованные жалобы).',
      'Запрещено без причины игнорировать вопросы покупателей.',
      'Запрещены неверные или нерабочие предложения, объявления с неверной ценой.',
      'Запрещено рекламировать один и тот же аккаунт на других торговых площадках для продажи; реклама в соцсетях и магазинах разрешена.',
      'Запрещена продажа товаров, полученных эксплойтом или незаконным путём.',
    ],
  },
  {
    title: '3. Akkauntlar va javobgarlik',
    titleRu: '3. Аккаунты и ответственность',
    items: [
      'Xaridor akkauntni olgach, sotuvchi yoki birinchi egasi qayta kirish huquqini tiklamasligi kerak. Aks holda to\'liq qaytariladi.',
      'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa — qisman qaytariladi (masalan 50%).',
      'Sotuvchi xaridor bilan kelishilgan muddatni buzsa — to\'lov muddatiga mutanosib kamayadi.',
      'Har bir nizo individual ko\'rib chiqiladi; chatdagi kelishuvlar hisobga olinadi.',
    ],
    itemsRu: [
      'После передачи аккаунта покупателю продавец или первый владелец не вправе восстанавливать доступ. Иначе — полный возврат.',
      'Если администрация игры заблокирует аккаунт из-за продажи — частичный возврат (например 50%).',
      'При нарушении продавцом согласованного срока — снижение выплаты пропорционально.',
      'Каждый спор рассматривается отдельно; учитываются договорённости в чате.',
    ],
  },
];

/** Quiz savollari: { id, questionUz, questionEn, questionRu, optionsUz, optionsEn, optionsRu, correctIndex } */
export const sellerRulesQuiz = [
  {
    id: 'q1',
    questionUz: 'To\'lov qayerda amalga oshirilishi kerak?',
    questionEn: 'Where must payment be made?',
    questionRu: 'Где должна производиться оплата?',
    optionsUz: ['Faqat WibeStore (Escrow) orqali', 'Telegram orqali', 'To\'g\'ridan-to\'g\'ri sotuvchiga', 'Istalgan usulda'],
    optionsEn: ['Only via WibeStore (Escrow)', 'Via Telegram', 'Directly to seller', 'Any method'],
    optionsRu: ['Только через WibeStore (Escrow)', 'Через Telegram', 'Напрямую продавцу', 'Любым способом'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    questionUz: 'Xaridor bilan qanday muloqot qilish mumkin?',
    questionEn: 'How may you communicate with the buyer?',
    questionRu: 'Как можно общаться с покупателем?',
    optionsUz: ['Faqat WibeStore chat orqali', 'Telegram yoki boshqa tashqari kanallar', 'Telefon orqali', 'Istalgan usulda'],
    optionsEn: ['Only via WibeStore chat', 'Telegram or other external channels', 'By phone', 'Any method'],
    optionsRu: ['Только через чат WibeStore', 'Telegram или другие внешние каналы', 'По телефону', 'Любым способом'],
    correctIndex: 0,
  },
  {
    id: 'q3',
    questionUz: 'Xaridor akkauntni olgach sotuvchi qayta kirish huquqini tiklasa nima bo\'ladi?',
    questionEn: 'If the seller restores access to the account after the buyer receives it, what happens?',
    questionRu: 'Если продавец восстановит доступ к аккаунту после получения покупателем, что произойдёт?',
    optionsUz: ['To\'liq qaytariladi (100%)', 'Qaytarilmaydi', 'Faqat ogohlantirish', '50% qaytariladi'],
    optionsEn: ['Full refund (100%)', 'No refund', 'Warning only', '50% refund'],
    optionsRu: ['Полный возврат (100%)', 'Без возврата', 'Только предупреждение', 'Возврат 50%'],
    correctIndex: 0,
  },
  {
    id: 'q4',
    questionUz: 'Platformadan tashqarida to\'lov talab qilish qanday qoidalangan?',
    questionEn: 'Asking for payment outside the platform is:',
    questionRu: 'Требование оплаты вне платформы:',
    optionsUz: ['Taqiqlanadi', 'Ruxsat etiladi', 'Faqat Premium uchun', 'Xaridor roziligi bilan ruxsat'],
    optionsEn: ['Prohibited', 'Allowed', 'Allowed for Premium only', 'Allowed with buyer consent'],
    optionsRu: ['Запрещено', 'Разрешено', 'Только для Premium', 'Разрешено с согласия покупателя'],
    correctIndex: 0,
  },
  {
    id: 'q5',
    questionUz: 'Reyting tizimini noto\'g\'ri ishlatish (nakrutka, shantaj) qanday jazoga olib keladi?',
    questionEn: 'Misusing the rating system (fake reviews, blackmail) leads to:',
    questionRu: 'Неправильное использование рейтинга (накрутка, шантаж) приводит к:',
    optionsUz: ['Reyting o\'chiriladi, takrorida akkaunt blok', 'Faqat ogohlantirish', 'Jazo yo\'q', 'Komissiya oshadi'],
    optionsEn: ['Review removed, account block on repeat', 'Warning only', 'No penalty', 'Higher commission'],
    optionsRu: ['Отзыв удалён, при повторении блок аккаунта', 'Только предупреждение', 'Без наказания', 'Повышение комиссии'],
    correctIndex: 0,
  },
  {
    id: 'q6',
    questionUz: 'Xaridorning savollarini asossiz e\'tiborsiz qoldirish:',
    questionEn: 'Ignoring buyer questions without good reason:',
    questionRu: 'Игнорирование вопросов покупателя без причины:',
    optionsUz: ['Ogohlantirish, takrorida vaqtincha blok', 'Jazo yo\'q', 'Faqat reyting pasayadi', 'To\'lov rad etiladi'],
    optionsEn: ['Warning, temporary block on repeat', 'No penalty', 'Only rating drops', 'Payout refused'],
    optionsRu: ['Предупреждение, при повторении временный блок', 'Без наказания', 'Только снижение рейтинга', 'Выплата отказана'],
    correctIndex: 0,
  },
  {
    id: 'q7',
    questionUz: 'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa xaridor uchun nima qilinadi?',
    questionEn: 'If the game admin blocks the account due to the sale, what happens for the buyer?',
    questionRu: 'Если администрация игры заблокирует аккаунт из-за продажи, что будет с покупателем?',
    optionsUz: ['Qisman qaytariladi (masalan 50%)', 'To\'liq qaytariladi', 'Qaytarilmaydi', 'Faqat yangi akkaunt beriladi'],
    optionsEn: ['Partial refund (e.g. 50%)', 'Full refund', 'No refund', 'Only a new account is provided'],
    optionsRu: ['Частичный возврат (например 50%)', 'Полный возврат', 'Без возврата', 'Только выдача нового аккаунта'],
    correctIndex: 0,
  },
  {
    id: 'q8',
    questionUz: 'Boshqa savdo platformalarida bir xil akkauntni sotish maqsadida reklama qilish:',
    questionEn: 'Advertising the same account on other trading platforms for sale is:',
    questionRu: 'Реклама одного аккаунта на других площадках для продажи:',
    optionsUz: ['Taqiqlanadi; to\'lovlar rad etiladi', 'Ruxsat etiladi', 'Faqat Premium uchun ruxsat', 'Ruxsat agar narx bir xil bo\'lsa'],
    optionsEn: ['Prohibited; payouts refused', 'Allowed', 'Allowed for Premium only', 'Allowed if price is same'],
    optionsRu: ['Запрещено; выплаты отклонены', 'Разрешено', 'Только для Premium', 'Разрешено при той же цене'],
    correctIndex: 0,
  },
  {
    id: 'q9',
    questionUz: 'Noyob yoki noqonuniy yo\'l bilan olingan mahsulotlarni sotish:',
    questionEn: 'Selling items obtained illegally or by exploit:',
    questionRu: 'Продажа предметов, полученных незаконно или эксплойтом:',
    optionsUz: ['Taqiqlanadi', 'Ruxsat etiladi', 'Faqat kichik miqdorda', 'O\'yin turiga qarab'],
    optionsEn: ['Prohibited', 'Allowed', 'Allowed in small amounts', 'Depends on game type'],
    optionsRu: ['Запрещено', 'Разрешено', 'В малых количествах', 'Зависит от типа игры'],
    correctIndex: 0,
  },
  {
    id: 'q10',
    questionUz: 'Xaridordan buyurtma bajarilishidan oldin tasdiqlashni so\'rash (aldov belgilari bo\'lmasa):',
    questionEn: 'Asking the buyer to confirm the order before it is actually completed (no signs of fraud):',
    questionRu: 'Просить покупателя подтвердить заказ до фактического выполнения (без признаков мошенничества):',
    optionsUz: ['Taqiqlanadi; vaqtincha blok', 'Ruxsat etiladi', 'Faqat Premium uchun ruxsat', 'Xaridor roziligi bilan ruxsat'],
    optionsEn: ['Prohibited; temporary block', 'Allowed', 'Allowed for Premium', 'Allowed with buyer consent'],
    optionsRu: ['Запрещено; временный блок', 'Разрешено', 'Разрешено для Premium', 'С согласия покупателя'],
    correctIndex: 0,
  },
];

/** 5 ta tasodifiy savol tanlash (sotuvchi) */
export function getRandomQuizQuestions(count = 5) {
  const shuffled = [...sellerRulesQuiz].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Xaridor qoidalari (sotib olishdan oldin har safar) ────────────────────

/** Xaridor qoidalari bo'limlari (uz, ru) */
export const buyerRulesSectionsUz = [
  {
    title: '1. Umumiy qoidalar (xaridor)',
    titleRu: '1. Общие правила (покупатель)',
    items: [
      'To\'lov faqat WibeStore (Escrow) orqali. Sotuvchiga to\'g\'ridan-to\'g\'ri pul o\'tkazish yoki platformadan tashqarida to\'lov qilish taqiqlanadi.',
      'Muloqot faqat WibeStore chat orqali. Telegram, telefon va boshqa tashqari kanallar orqali to\'lov yoki ma\'lumot almashish taqiqlanadi.',
      'Akkauntni olganingizdan keyin sotuvchi qayta kirish huquqini tiklasa, to\'liq qaytariladi (100%).',
      'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa — qisman qaytariladi (masalan 50%).',
    ],
    itemsRu: [
      'Оплата только через WibeStore (Escrow). Запрещены переводы напрямую продавцу и оплата вне платформы.',
      'Общение только через чат WibeStore. Запрещены оплата или обмен данными через Telegram, телефон и др.',
      'Если после получения аккаунта продавец восстановит доступ — полный возврат (100%).',
      'Если администрация игры заблокирует аккаунт из-за продажи — частичный возврат (например 50%).',
    ],
  },
  {
    title: '2. Xaridor uchun mas'uliyat',
    titleRu: '2. Ответственность покупателя',
    items: [
      'Buyurtmani tasdiqlashdan oldin akkauntni tekshiring. Tasdiqlaganingizdan keyin nizo qiyinlashadi.',
      'Sotuvchi bilan chatdagi kelishuvlar nizo hal qilinishida hisobga olinadi.',
      'Shubhali takliflar yoki noto\'g\'ri ma\'lumot uchun sayt orqali shikoyat qilishingiz mumkin.',
    ],
    itemsRu: [
      'Проверьте аккаунт до подтверждения заказа. После подтверждения спор решить сложнее.',
      'Договорённости в чате с продавцом учитываются при разборе споров.',
      'По подозрительным предложениям или неверным данным можно пожаловаться через сайт.',
    ],
  },
];

/** Xaridor quiz savollari */
export const buyerRulesQuiz = [
  { id: 'bq1', questionUz: 'To\'lov qayerda amalga oshirilishi kerak?', questionEn: 'Where must payment be made?', questionRu: 'Где должна производиться оплата?', optionsUz: ['Faqat WibeStore (Escrow) orqali', 'Telegram orqali', 'To\'g\'ridan-to\'g\'ri sotuvchiga', 'Istalgan usulda'], optionsEn: ['Only via WibeStore (Escrow)', 'Via Telegram', 'Directly to seller', 'Any method'], optionsRu: ['Только через WibeStore (Escrow)', 'Через Telegram', 'Напрямую продавцу', 'Любым способом'], correctIndex: 0 },
  { id: 'bq2', questionUz: 'Sotuvchi bilan qanday muloqot qilish kerak?', questionEn: 'How should you communicate with the seller?', questionRu: 'Как следует общаться с продавцом?', optionsUz: ['Faqat WibeStore chat orqali', 'Telegram orqali', 'Telefon orqali', 'Istalgan usulda'], optionsEn: ['Only via WibeStore chat', 'Via Telegram', 'By phone', 'Any method'], optionsRu: ['Только через чат WibeStore', 'Через Telegram', 'По телефону', 'Любым способом'], correctIndex: 0 },
  { id: 'bq3', questionUz: 'Akkauntni olgach sotuvchi qayta kirish huquqini tiklasa nima bo\'ladi?', questionEn: 'If the seller restores access after you receive the account?', questionRu: 'Если продавец восстановит доступ после получения вами аккаунта?', optionsUz: ['To\'liq qaytariladi (100%)', 'Qaytarilmaydi', '50% qaytariladi', 'Faqat ogohlantirish'], optionsEn: ['Full refund (100%)', 'No refund', '50% refund', 'Warning only'], optionsRu: ['Полный возврат (100%)', 'Без возврата', 'Возврат 50%', 'Только предупреждение'], correctIndex: 0 },
  { id: 'bq4', questionUz: 'Buyurtmani tasdiqlashdan oldin nima qilish kerak?', questionEn: 'Before confirming the order you should:', questionRu: 'Перед подтверждением заказа вы должны:', optionsUz: ['Akkauntni tekshirish', 'Tasdiqlamasdan to\'lash', 'Sotuvchiga tashqarida to\'lash', 'Hech narsa'], optionsEn: ['Check the account', 'Pay without checking', 'Pay outside the platform', 'Nothing'], optionsRu: ['Проверить аккаунт', 'Оплатить без проверки', 'Оплатить вне платформы', 'Ничего'], correctIndex: 0 },
  { id: 'bq5', questionUz: 'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa xaridor uchun nima qilinadi?', questionEn: 'If the game admin blocks the account due to the sale?', questionRu: 'Если администрация игры заблокирует аккаунт из-за продажи?', optionsUz: ['Qisman qaytariladi (masalan 50%)', 'To\'liq qaytariladi', 'Qaytarilmaydi', 'Yangi akkaunt beriladi'], optionsEn: ['Partial refund (e.g. 50%)', 'Full refund', 'No refund', 'New account provided'], optionsRu: ['Частичный возврат (например 50%)', 'Полный возврат', 'Без возврата', 'Выдаётся новый аккаунт'], correctIndex: 0 },
  { id: 'bq6', questionUz: 'Sotuvchi platformadan tashqarida to\'lov so\'rasa nima qilish kerak?', questionEn: 'If the seller asks for payment outside the platform?', questionRu: 'Если продавец просит оплату вне платформы?', optionsUz: ['Rad etish va sayt orqali to\'lash', 'Telegram orqali to\'lash', 'Sotuvchiga to\'g\'ridan-to\'g\'ri to\'lash', 'Istalgan usulda to\'lash'], optionsEn: ['Refuse and pay via site', 'Pay via Telegram', 'Pay directly to seller', 'Pay any way'], optionsRu: ['Отказать и оплатить через сайт', 'Оплатить через Telegram', 'Оплатить напрямую продавцу', 'Оплатить любым способом'], correctIndex: 0 },
];

export function getRandomBuyerQuizQuestions(count = 5) {
  const shuffled = [...buyerRulesQuiz].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
