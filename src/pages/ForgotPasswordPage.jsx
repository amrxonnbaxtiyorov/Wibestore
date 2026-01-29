import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Gamepad2, AlertCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Email manzilini kiriting');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('To\'g\'ri email manzilini kiriting');
            return;
        }

        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsLoading(false);
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
                <div className="w-full max-w-md px-4 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">Email yuborildi!</h1>
                    <p className="text-gray-400 mb-8">
                        Parolni tiklash havolasi <span className="text-white">{email}</span> manziliga yuborildi.
                        Iltimos, pochta qutingizni tekshiring.
                    </p>
                    <div className="space-y-3">
                        <Link
                            to="/login"
                            className="block w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 text-center"
                        >
                            Login sahifasiga qaytish
                        </Link>
                        <button
                            onClick={() => {
                                setIsSubmitted(false);
                                setEmail('');
                            }}
                            className="block w-full py-4 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors"
                        >
                            Boshqa email kiritish
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-8">
                        Email kelmadimi? Spam papkasini tekshiring yoki 5 daqiqadan keyin qayta urinib ko'ring.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
            <div className="w-full max-w-md px-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Gamepad2 className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            wibestore.com
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">Parolni tiklash</h1>
                    <p className="text-gray-400">Email manzilingizni kiriting va biz sizga parolni tiklash havolasini yuboramiz</p>
                </div>

                {/* Form */}
                <div className="bg-[#1e1e32] rounded-2xl p-8 border border-white/5">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email manzili
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full pl-12 pr-4 py-3 bg-[#25253a] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Yuborilmoqda...' : 'Havola yuborish'}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 mt-6 text-gray-400 hover:text-purple-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Login sahifasiga qaytish
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
