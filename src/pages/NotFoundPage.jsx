import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Gamepad2 } from 'lucide-react';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen pt-24 pb-16 flex items-center justify-center page-enter">
            <div className="max-w-2xl mx-auto px-4 text-center">
                {/* 404 Animation */}
                <div className="relative mb-8">
                    <div className="text-[150px] sm:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 leading-none select-none animate-pulse">
                        404
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl animate-pulse" />
                    </div>
                </div>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <Gamepad2 className="w-10 h-10 text-purple-400" />
                </div>

                {/* Text */}
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Sahifa topilmadi
                </h1>
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                    Kechirasiz, siz izlayotgan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                    >
                        <Home className="w-5 h-5" />
                        Bosh sahifa
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 text-gray-300 font-semibold rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Orqaga qaytish
                    </button>
                </div>

                {/* Search suggestion */}
                <div className="mt-12 p-6 bg-[#1e1e32] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <Search className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-400">Quyidagi sahifalarni ko'rishingiz mumkin:</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        <Link to="/products" className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors">
                            Mahsulotlar
                        </Link>
                        <Link to="/premium" className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors">
                            Premium
                        </Link>
                        <Link to="/top" className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors">
                            Top akkauntlar
                        </Link>
                        <Link to="/faq" className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors">
                            FAQ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
