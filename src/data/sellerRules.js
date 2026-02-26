/**
 * Sotuvchi qoidalari (FunPay uslubida) va savollar — akkaunt joylashdan oldin o'qish + test majburiy.
 * Quiz: 5 ta tasodifiy savol, barchasi to'g'ri bo'lishi kerak.
 */

export const SELLER_RULES_STORAGE_KEY = 'wibe_seller_rules_passed';

/** Qoidalar bo'limlari (uz) */
export const sellerRulesSectionsUz = [
  {
    title: '1. Umumiy qoidalar',
    items: [
      'Boshqa foydalanuvchilarga kontakt ma\'lumotlaringizni (Telegram, Discord, telefon va b.) berish taqiqlanadi. Faqat WibeStore ichidagi chat orqali muloqot.',
      'To\'lov faqat WibeStore orqali (Escrow). Sotuvchi yoki xaridorga to\'g\'ridan-to\'g\'ri pul o\'tkazish yoki platformadan tashqarida to\'lov talab qilish taqiqlanadi.',
      'Reyting tizimini noto\'g\'ri ishlatish (nakrutka, shantaj, asossiz bad review) taqiqlanadi.',
      'Uchinchi shaxsga boshqa foydalanuvchi haqida ma\'lumot berish yoki zarar yetkazish maqsadida ma\'lumot tarqatish taqiqlanadi.',
      'WibeStore akkauntini sotish yoki sotib olish urinishi taqiqlanadi.',
      'Firibgarlik, aldash va ataylab zarar yetkazish — barcha akkauntlar bloklanadi va to\'lovlar rad etiladi.',
    ],
  },
  {
    title: '2. Sotuvchilar uchun taqiqlar',
    items: [
      'Tovarni Escrow orqali to\'lovsiz berish yoki platformadan tashqarida savdo qilish taqiqlanadi.',
      'Xaridordan buyurtma bajarilishidan oldin tasdiqlashni so\'rash (aldov belgilari bo\'lmasa) taqiqlanadi.',
      'Raqobatchilarga qarshi noto\'g\'ri harakatlar (yomon reyting uchun xarid qilish, asossiz shikoyatlar) taqiqlanadi.',
      'Xaridorlarning savollarini asossiz e\'tiborsiz qoldirish taqiqlanadi.',
      'Noto\'g\'ri yoki ishlamaydigan takliflar, noto\'g\'ri narx bilan e\'lon berish taqiqlanadi.',
      'Boshqa platformalarda bir xil akkauntni reklama qilish (sotish maqsadida) taqiqlanadi; ijtimoiy tarmoqlarda reklama va do\'konlarga sotish ruxsat etiladi.',
      'Noyob yoki noqonuniy yo\'l bilan olingan mahsulotlarni sotish taqiqlanadi.',
    ],
  },
  {
    title: '3. Akkauntlar va javobgarlik',
    items: [
      'Xaridor akkauntni olgach, sotuvchi yoki birinchi egasi qayta kirish huquqini tiklamasligi kerak. Aks holda to\'liq qaytariladi.',
      'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa — qisman qaytariladi (masalan 50%).',
      'Sotuvchi xaridor bilan kelishilgan muddatni buzsa — to\'lov muddatiga mutanosib kamayadi.',
      'Har bir nizo individual ko\'rib chiqiladi; chatdagi kelishuvlar hisobga olinadi.',
    ],
  },
];

/** Quiz savollari: { id, questionUz, questionEn, optionsUz, optionsEn, correctIndex } */
export const sellerRulesQuiz = [
  {
    id: 'q1',
    questionUz: 'To\'lov qayerda amalga oshirilishi kerak?',
    questionEn: 'Where must payment be made?',
    optionsUz: ['Faqat WibeStore (Escrow) orqali', 'Telegram orqali', 'To\'g\'ridan-to\'g\'ri sotuvchiga', 'Istalgan usulda'],
    optionsEn: ['Only via WibeStore (Escrow)', 'Via Telegram', 'Directly to seller', 'Any method'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    questionUz: 'Xaridor bilan qanday muloqot qilish mumkin?',
    questionEn: 'How may you communicate with the buyer?',
    optionsUz: ['Faqat WibeStore chat orqali', 'Telegram yoki boshqa tashqari kanallar', 'Telefon orqali', 'Istalgan usulda'],
    optionsEn: ['Only via WibeStore chat', 'Telegram or other external channels', 'By phone', 'Any method'],
    correctIndex: 0,
  },
  {
    id: 'q3',
    questionUz: 'Xaridor akkauntni olgach sotuvchi qayta kirish huquqini tiklasa nima bo\'ladi?',
    questionEn: 'If the seller restores access to the account after the buyer receives it, what happens?',
    optionsUz: ['To\'liq qaytariladi (100%)', 'Qaytarilmaydi', 'Faqat ogohlantirish', '50% qaytariladi'],
    optionsEn: ['Full refund (100%)', 'No refund', 'Warning only', '50% refund'],
    correctIndex: 0,
  },
  {
    id: 'q4',
    questionUz: 'Platformadan tashqarida to\'lov talab qilish qanday qoidalangan?',
    questionEn: 'Asking for payment outside the platform is:',
    optionsUz: ['Taqiqlanadi', 'Ruxsat etiladi', 'Faqat Premium uchun', 'Xaridor roziligi bilan ruxsat'],
    optionsEn: ['Prohibited', 'Allowed', 'Allowed for Premium only', 'Allowed with buyer consent'],
    correctIndex: 0,
  },
  {
    id: 'q5',
    questionUz: 'Reyting tizimini noto\'g\'ri ishlatish (nakrutka, shantaj) qanday jazoga olib keladi?',
    questionEn: 'Misusing the rating system (fake reviews, blackmail) leads to:',
    optionsUz: ['Reyting o\'chiriladi, takrorida akkaunt blok', 'Faqat ogohlantirish', 'Jazo yo\'q', 'Komissiya oshadi'],
    optionsEn: ['Review removed, account block on repeat', 'Warning only', 'No penalty', 'Higher commission'],
    correctIndex: 0,
  },
  {
    id: 'q6',
    questionUz: 'Xaridorning savollarini asossiz e\'tiborsiz qoldirish:',
    questionEn: 'Ignoring buyer questions without good reason:',
    optionsUz: ['Ogohlantirish, takrorida vaqtincha blok', 'Jazo yo\'q', 'Faqat reyting pasayadi', 'To\'lov rad etiladi'],
    optionsEn: ['Warning, temporary block on repeat', 'No penalty', 'Only rating drops', 'Payout refused'],
    correctIndex: 0,
  },
  {
    id: 'q7',
    questionUz: 'O\'yin administratsiyasi akkauntni savdo tufayli bloklasa xaridor uchun nima qilinadi?',
    questionEn: 'If the game admin blocks the account due to the sale, what happens for the buyer?',
    optionsUz: ['Qisman qaytariladi (masalan 50%)', 'To\'liq qaytariladi', 'Qaytarilmaydi', 'Faqat yangi akkaunt beriladi'],
    optionsEn: ['Partial refund (e.g. 50%)', 'Full refund', 'No refund', 'Only a new account is provided'],
    correctIndex: 0,
  },
  {
    id: 'q8',
    questionUz: 'Boshqa savdo platformalarida bir xil akkauntni sotish maqsadida reklama qilish:',
    questionEn: 'Advertising the same account on other trading platforms for sale is:',
    optionsUz: ['Taqiqlanadi; to\'lovlar rad etiladi', 'Ruxsat etiladi', 'Faqat Premium uchun ruxsat', 'Ruxsat agar narx bir xil bo\'lsa'],
    optionsEn: ['Prohibited; payouts refused', 'Allowed', 'Allowed for Premium only', 'Allowed if price is same'],
    correctIndex: 0,
  },
  {
    id: 'q9',
    questionUz: 'Noyob yoki noqonuniy yo\'l bilan olingan mahsulotlarni sotish:',
    questionEn: 'Selling items obtained illegally or by exploit:',
    optionsUz: ['Taqiqlanadi', 'Ruxsat etiladi', 'Faqat kichik miqdorda', 'O\'yin turiga qarab'],
    optionsEn: ['Prohibited', 'Allowed', 'Allowed in small amounts', 'Depends on game type'],
    correctIndex: 0,
  },
  {
    id: 'q10',
    questionUz: 'Xaridordan buyurtma bajarilishidan oldin tasdiqlashni so\'rash (aldov belgilari bo\'lmasa):',
    questionEn: 'Asking the buyer to confirm the order before it is actually completed (no signs of fraud):',
    optionsUz: ['Taqiqlanadi; vaqtincha blok', 'Ruxsat etiladi', 'Faqat Premium uchun ruxsat', 'Xaridor roziligi bilan ruxsat'],
    optionsEn: ['Prohibited; temporary block', 'Allowed', 'Allowed for Premium', 'Allowed with buyer consent'],
    correctIndex: 0,
  },
];

/** 5 ta tasodifiy savol tanlash (id boʻyicha unique) */
export function getRandomQuizQuestions(count = 5) {
  const shuffled = [...sellerRulesQuiz].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
