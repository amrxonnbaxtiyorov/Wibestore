/**
 * O'zbekiston telefon raqamini kiritishda avtomatik formatlash.
 * Ko'rsatish formati: +998 94-201-43-00 (oralar ochiq).
 * Faqat raqamlarni qabul qiladi, format inputda avtomatik qo'llanadi.
 */

/**
 * Input qiymatini +998 XX-XXX-XX-XX ko'rinishida qaytaradi.
 * @param {string} value - Foydalanuvchi kiritgan matn (har qanday belgilar)
 * @returns {string} Formatlangan raqam (masalan: +998 94-201-43-00)
 */
export function formatUzPhoneDisplay(value) {
  if (value == null || typeof value !== 'string') return '';
  let digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';

  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }

  digits = digits.slice(0, 9);

  let out = '+998 ';
  if (digits.length > 0) out += digits.slice(0, 2);
  if (digits.length > 2) out += '-' + digits.slice(2, 5);
  if (digits.length > 5) out += '-' + digits.slice(5, 7);
  if (digits.length > 7) out += '-' + digits.slice(7, 9);
  return out;
}

/**
 * Formatlangan yoki oddiy raqamni API uchun tozalangan +998XXXXXXXXX ko'rinishida qaytaradi.
 * @param {string} value - Inputdagi qiymat (formatlangan yoki yo'q)
 * @returns {string} Faqat raqamlar va + boshida (masalan: +998942014300)
 */
export function normalizeUzPhoneForSubmit(value) {
  if (value == null || typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9) return '';
  if (digits.startsWith('998') && digits.length === 12) return '+' + digits;
  if (digits.length >= 9 && digits[0] === '9') return '+998' + digits.slice(0, 9);
  if (digits.startsWith('998')) return '+' + digits.slice(0, 12);
  return '+998' + digits.slice(-9);
}
