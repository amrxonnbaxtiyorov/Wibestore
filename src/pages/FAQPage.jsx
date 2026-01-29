import { useState } from 'react';
import { HelpCircle, ChevronDown, Search, ShoppingBag, CreditCard, Shield, User, MessageCircle } from 'lucide-react';

const FAQPage = () => {
    const [openIndex, setOpenIndex] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: 'all', label: 'Barchasi', icon: HelpCircle },
        { id: 'buying', label: 'Xarid qilish', icon: ShoppingBag },
        { id: 'selling', label: 'Sotish', icon: CreditCard },
        { id: 'security', label: 'Xavfsizlik', icon: Shield },
        { id: 'account', label: 'Hisob', icon: User },
    ];

    const faqs = [
        {
            category: 'buying',
            question: 'Akkauntni qanday sotib olaman?',
            answer: 'Akkauntni tanlang, "Sotib olish" tugmasini bosing, to\'lov usulini tanlang va to\'lovni amalga oshiring. To\'lov tasdiqlangandan so\'ng akkaunt ma\'lumotlari sizga yuboriladi.'
        },
        {
            category: 'buying',
            question: 'To\'lov qanday amalga oshiriladi?',
            answer: 'Biz Payme, Click, Paynet, Uzcard va Humo orqali to\'lovlarni qabul qilamiz. Barcha to\'lovlar xavfsiz va shifrlangan.'
        },
        {
            category: 'buying',
            question: 'Akkaunt ishlamasa nima qilaman?',
            answer: '48 soat ichida "Shikoyat qilish" tugmasini bosing. Bizning moderatorlar tekshiradi va muammo tasdiqlansa, pul to\'liq qaytariladi.'
        },
        {
            category: 'buying',
            question: 'Akkauntni tekshirish uchun qancha vaqt bor?',
            answer: 'Xarid qilganidan keyin 48 soat ichida akkauntni tekshirishingiz va tasdiqlashingiz kerak. Bu vaqt ichida muammo bo\'lsa, pul qaytariladi.'
        },
        {
            category: 'selling',
            question: 'Akkauntimni qanday sotaman?',
            answer: 'Profilingizga kiring, "Sotish" sahifasiga o\'ting, akkaunt haqida ma\'lumotlarni to\'ldiring va e\'lon joylashtiring. Moderatsiyadan o\'tgandan keyin akkauntingiz saytda paydo bo\'ladi.'
        },
        {
            category: 'selling',
            question: 'Komissiya qancha?',
            answer: 'Free rejada 10%, Premium rejada 10% (lekin ko\'proq ko\'rinish), Pro rejada 0% komissiya. Pro reja eng foydali variant!'
        },
        {
            category: 'selling',
            question: 'Pulni qachon olaman?',
            answer: 'Xaridor akkauntni tasdiqlaganidan keyin 1-3 ish kuni ichida pul sizning hamyoningizga o\'tkaziladi. Keyin bank kartangizga yechib olishingiz mumkin.'
        },
        {
            category: 'selling',
            question: 'E\'lonim nima uchun rad etildi?',
            answer: 'E\'lon qoidalarga mos kelmasa rad etiladi: noto\'g\'ri ma\'lumotlar, sifatsiz rasmlar, taqiqlangan kontent. Xatolikni tuzatib qayta yuborishingiz mumkin.'
        },
        {
            category: 'security',
            question: 'Escrow tizimi nima?',
            answer: 'Escrow - bu xavfsiz to\'lov tizimi. Xaridor to\'laganda pul bizda saqlanadi. Faqat xaridor akkauntni tasdiqlaganidan keyin pul sotuvchiga o\'tkaziladi.'
        },
        {
            category: 'security',
            question: 'Firibgarlikdan qanday himoyalanaman?',
            answer: 'Faqat platforma orqali savdo qiling, hech qachon platformadan tashqarida to\'lov qilmang. Shubhali e\'lonlarni xabar bering. Bizning moderatorlar 24/7 ishlaydi.'
        },
        {
            category: 'security',
            question: 'Ma\'lumotlarim xavfsizmi?',
            answer: 'Ha, biz SSL shifrlash va xavfsiz serverlardan foydalanamiz. Akkaunt ma\'lumotlari faqat xarid tasdiqlangandan keyin xaridorga ko\'rsatiladi.'
        },
        {
            category: 'account',
            question: 'Parolimni unutdim, nima qilaman?',
            answer: 'Login sahifasida "Parolni unutdingizmi?" havolasini bosing. Email manzilingizga parolni tiklash havolasi yuboriladi.'
        },
        {
            category: 'account',
            question: 'Hisobimni qanday o\'chiraman?',
            answer: 'Sozlamalar sahifasida "Hisobni o\'chirish" bo\'limiga o\'ting. Eslatma: o\'chirilgan hisobni tiklash mumkin emas.'
        },
        {
            category: 'account',
            question: 'Premium obunani qanday bekor qilaman?',
            answer: 'Sozlamalar > Obuna bo\'limiga o\'ting va "Bekor qilish" tugmasini bosing. Obuna davri oxirigacha Premium imkoniyatlardan foydalanishingiz mumkin.'
        },
    ];

    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium mb-6">
                        <HelpCircle className="w-4 h-4" />
                        Yordam markazi
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                        Ko'p beriladigan savollar
                    </h1>
                    <p className="text-gray-400">
                        Savolingizga javob toping yoki biz bilan bog'laning
                    </p>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Savol qidiring..."
                        className="w-full pl-12 pr-4 py-4 bg-[#1e1e32] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                    />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeCategory === cat.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-[#1e1e32] text-gray-400 hover:bg-[#25253a] hover:text-white'
                                }`}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-[#1e1e32] rounded-xl border border-white/5 overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-[#25253a] transition-colors"
                                >
                                    <span className="font-medium text-white pr-4">{faq.question}</span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''
                                        }`} />
                                </button>
                                {openIndex === index && (
                                    <div className="px-5 pb-5 text-gray-400 border-t border-white/5 pt-4">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">Hech narsa topilmadi</p>
                        </div>
                    )}
                </div>

                {/* Contact */}
                <div className="mt-12 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20 text-center">
                    <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Javob topmadingizmi?</h3>
                    <p className="text-gray-400 mb-6">Bizning qo'llab-quvvatlash jamoamiz sizga yordam beradi</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="https://t.me/wibestore"
                            className="flex items-center gap-2 px-6 py-3 bg-[#0088cc] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            💬 Telegram orqali
                        </a>
                        <a
                            href="mailto:support@wibestore.com"
                            className="flex items-center gap-2 px-6 py-3 bg-[#25253a] rounded-xl text-white font-medium hover:bg-[#2a2a45] transition-colors"
                        >
                            📧 Email orqali
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
