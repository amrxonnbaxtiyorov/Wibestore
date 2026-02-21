import { Shield, AlertTriangle, CreditCard, Users, Lock, FileText, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const TermsPage = () => {
    const { t } = useLanguage();

    const Section = ({ icon: Icon, iconColor, title, children, highlight }) => (
        <section
            style={{
                backgroundColor: highlight ? 'var(--color-error-bg)' : 'var(--color-bg-primary)',
                border: `1px solid ${highlight ? 'var(--color-error)' : 'var(--color-border-default)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: '32px',
            }}
        >
            <div className="flex items-center justify-center gap-3" style={{ marginBottom: '20px' }}>
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{title}</h2>
            </div>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-lg)', textAlign: 'center' }}>
                {children}
            </div>
        </section>
    );

    const ListItem = ({ icon: Icon, color, children }) => (
        <li className="flex items-start gap-3">
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
            <span>{children}</span>
        </li>
    );

    return (
        <div className="page-enter" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
            <div className="gh-container" style={{ maxWidth: '800px' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link to="/">{t('common.home')}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{t('terms.title') || 'Terms'}</span>
                </div>

                {/* Header */}
                <div className="text-center" style={{ paddingTop: '32px', marginBottom: '40px' }}>
                    <div className="badge badge-blue inline-flex items-center gap-2" style={{ padding: '6px 14px', marginBottom: '20px', fontSize: '13px' }}>
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t('terms.badge') || 'Legal Documents'}</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        {t('terms.heading') || 'Terms of Service'}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {t('terms.last_updated') || 'Last updated: January 29, 2026'}
                    </p>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    {/* 1. General */}
                    <Section icon={FileText} iconColor="var(--color-accent-blue)" title={t('terms.s1_title') || '1. General Rules'}>
                        <p style={{ marginBottom: '12px' }}>
                            WibeStore.com — bu o'yin akkauntlari va raqamli mahsulotlarni xavfsiz sotib olish va sotish platformasi. Saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.
                        </p>
                        <p>Bizning maqsadimiz — xaridorlar va sotuvchilar o'rtasida xavfsiz, ishonchli va shaffof savdo muhitini yaratish.</p>
                    </Section>

                    {/* 2. User Requirements */}
                    <Section icon={Users} iconColor="var(--color-accent-blue)" title={t('terms.s2_title') || '2. User Requirements'}>
                        <p style={{ marginBottom: '16px' }}>Platformadan foydalanish uchun:</p>
                        <div className="flex justify-center">
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)">Kamida 16 yoshda bo'lishingiz kerak</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)">Haqiqiy va to'g'ri ma'lumotlar bilan ro'yxatdan o'tishingiz kerak</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)">Bitta shaxsga bitta hisob — ko'p hisoblar taqiqlanadi</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)">O'zbekiston Respublikasi qonunlariga rioya qilishingiz kerak</ListItem>
                            </ul>
                        </div>
                    </Section>

                    {/* 3. Commission */}
                    <Section icon={CreditCard} iconColor="var(--color-accent-green)" title={t('terms.s3_title') || '3. Commission & Payments'}>
                        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '12px' }}>
                            <table className="gh-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }}>Reja</th>
                                        <th style={{ textAlign: 'center' }}>Komissiya</th>
                                        <th style={{ textAlign: 'center' }}>Izoh</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>Free</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-orange)' }}>10%</td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Har bir sotuvdan</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>Premium</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-orange)' }}>10%</td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>+ Yuqori ko'rinish</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>Pro</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent-green)' }}>0%</td>
                                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Komissiyasiz</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            * Komissiya faqat muvaffaqiyatli sotuvlardan olinadi. Bekor qilingan yoki qaytarilgan sotuvlardan komissiya olinmaydi.
                        </p>
                    </Section>

                    {/* 4. Anti-Scam */}
                    <Section icon={AlertTriangle} iconColor="var(--color-error)" title={t('terms.s4_title') || '4. Anti-Fraud Rules'} highlight>
                        <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)', marginBottom: '16px' }}>Quyidagi harakatlar qat'iyan taqiqlanadi:</p>
                        <div className="flex justify-center">
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                <ListItem icon={XCircle} color="var(--color-error)"><strong>Soxta akkauntlar sotish</strong> — mavjud bo'lmagan yoki o'g'irlangan akkauntlarni sotish</ListItem>
                                <ListItem icon={XCircle} color="var(--color-error)"><strong>Noto'g'ri ma'lumotlar</strong> — akkaunt haqida yolg'on ma'lumot berish</ListItem>
                                <ListItem icon={XCircle} color="var(--color-error)"><strong>Platformadan tashqari savdo</strong> — to'lovlarni saytdan tashqarida amalga oshirish</ListItem>
                                <ListItem icon={XCircle} color="var(--color-error)"><strong>Akkauntni qaytarib olish</strong> — sotilgan akkauntni qaytarib olish urinishi</ListItem>
                                <ListItem icon={XCircle} color="var(--color-error)"><strong>Ko'p hisoblar</strong> — bir nechta hisoblar yaratish va ulardan foydalanish</ListItem>
                            </ul>
                        </div>
                        <div style={{ marginTop: '24px', padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error)' }}>
                            <p style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)' }}>⚠️ Ogohlantirish:</p>
                            <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                                Firibgarlik aniqlansa, foydalanuvchi hisobi darhol bloklanadi, barcha mablag'lar muzlatiladi va tegishli huquqiy choralar ko'riladi.
                            </p>
                        </div>
                    </Section>

                    {/* 5. Security */}
                    <Section icon={Shield} iconColor="var(--color-accent-green)" title={t('terms.s5_title') || '5. Security Guarantee'}>
                        <p style={{ marginBottom: '16px' }}>WibeStore xaridorlar va sotuvchilarni himoya qilish uchun quyidagi choralarni ko'radi:</p>
                        <div className="flex justify-center">
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)">{t('terms.escrow_item')}</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)"><strong>Akkaunt tekshiruvi</strong> — sotuvchilar akkauntlarni tasdiqlashdan o'tkazishi kerak</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)"><strong>48 soatlik kafolat</strong> — xarid qilingan akkaunt 48 soat ichida tekshiriladi</ListItem>
                                <ListItem icon={CheckCircle} color="var(--color-accent-green)"><strong>To'liq qaytarish</strong> — muammo bo'lsa, pul to'liq qaytariladi</ListItem>
                            </ul>
                        </div>
                    </Section>

                    {/* 6. Transaction Process */}
                    <Section icon={CreditCard} iconColor="var(--color-accent-blue)" title={t('terms.s6_title') || '6. Transaction Process'}>
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '12px' }}>
                            <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                <h3 style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Xaridor uchun:</h3>
                                <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--font-size-sm)', textAlign: 'left' }}>
                                    <li>1. Akkauntni tanlang va to'lang</li>
                                    <li>2. Akkaunt ma'lumotlarini oling</li>
                                    <li>3. 48 soat ichida tekshiring</li>
                                    <li>4. Tasdiqlang yoki muammo bildiring</li>
                                </ol>
                            </div>
                            <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-muted)' }}>
                                <h3 style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Sotuvchi uchun:</h3>
                                <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--font-size-sm)', textAlign: 'left' }}>
                                    <li>1. Akkauntni e'lon qiling</li>
                                    <li>2. Xaridor topilganda ma'lumot bering</li>
                                    <li>3. Xaridor tasdiqlaguncha kuting</li>
                                    <li>4. Pulni oling (1-3 ish kuni)</li>
                                </ol>
                            </div>
                        </div>
                    </Section>

                    {/* 7. Privacy */}
                    <Section icon={Lock} iconColor="var(--color-accent-orange)" title={t('terms.s7_title') || '7. Privacy Policy'}>
                        <p style={{ marginBottom: '16px' }}>Biz quyidagi ma'lumotlarni yig'amiz va xavfsiz saqlaymiz:</p>
                        <div className="flex justify-center" style={{ marginBottom: '16px' }}>
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                                <li>• Ism, email, telefon raqami</li>
                                <li>• IP manzil va qurilma ma'lumotlari</li>
                                <li>• To'lov tarixi va savdo ma'lumotlari</li>
                            </ul>
                        </div>
                        <p>Sizning ma'lumotlaringiz uchinchi shaxslarga sotilmaydi yoki almashtirilmaydi. Faqat qonun talabiga binoan huquq-tartibot organlariga berilishi mumkin.</p>
                    </Section>

                    {/* 8. Disputes */}
                    <Section icon={MessageCircle} iconColor="var(--color-accent-blue)" title={t('terms.s8_title') || '8. Dispute Resolution'}>
                        <p style={{ marginBottom: '16px' }}>Muammo yuz berganda:</p>
                        <div className="flex justify-center">
                            <ol style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                {['Avval sotuvchi/xaridor bilan muloqot qiling', 'Hal bo\'lmasa, "Shikoyat qilish" tugmasini bosing', 'Bizning moderatorlar 24 soat ichida tekshiradi', 'Adolatli qaror qabul qilinadi'].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span style={{
                                            width: '24px', height: '24px', borderRadius: 'var(--radius-full)',
                                            backgroundColor: 'var(--color-accent-blue)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)',
                                            flexShrink: 0,
                                        }}>{i + 1}</span>
                                        <span style={{ paddingTop: '2px' }}>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </Section>

                    {/* 9. Changes */}
                    <Section icon={FileText} iconColor="var(--color-accent-blue)" title={t('terms.s9_title') || '9. Changes to Terms'}>
                        <p>WibeStore ushbu shartlarni istalgan vaqtda o'zgartirishga haqli. O'zgarishlar haqida email orqali xabar beriladi. O'zgarishlardan keyin saytdan foydalanishni davom ettirsangiz, yangi shartlarga rozilik bildirgan hisoblanasiz.</p>
                    </Section>

                    {/* Contact CTA */}
                    <div
                        className="text-center"
                        style={{
                            padding: '32px',
                            borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-info-bg)',
                            border: '1px solid var(--color-accent-blue)',
                        }}
                    >
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '16px' }}>Aloqa</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>Savollar yoki takliflar uchun biz bilan bog'laning:</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a href="mailto:support@wibestore.uz" className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
                                📧 support@wibestore.uz
                            </a>
                            <a href="https://t.me/wibestoreuz" className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
                                💬 Telegram: @wibestoreuz
                            </a>
                        </div>
                    </div>
                </div>

                {/* Accept */}
                <div className="text-center" style={{ padding: '32px 16px' }}>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                        WibeStore platformasidan foydalanish orqali siz yuqoridagi barcha shartlarga rozilik bildirasiz.
                    </p>
                    <Link to="/" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
                        {t('terms.back_home') || 'Go to Homepage'}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
