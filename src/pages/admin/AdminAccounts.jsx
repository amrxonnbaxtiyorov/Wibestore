import { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Check, X, Crown, Ban, MoreVertical, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { formatPrice, games } from '../../data/mockData';

const AdminAccounts = () => {
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState([]);
    const [selectedListing, setSelectedListing] = useState(null);
    const [showCredentials, setShowCredentials] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Load listings from localStorage
    useEffect(() => {
        loadListings();
    }, []);

    const loadListings = () => {
        const savedListings = localStorage.getItem('wibeListings');
        if (savedListings) {
            setListings(JSON.parse(savedListings));
        }
    };

    const statusFilters = [
        { value: 'all', label: 'Barchasi' },
        { value: 'pending', label: 'Kutilmoqda' },
        { value: 'active', label: 'Faol' },
        { value: 'rejected', label: 'Rad etilgan' },
        { value: 'sold', label: 'Sotilgan' },
    ];

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-green-500/20 text-green-400',
            pending: 'bg-yellow-500/20 text-yellow-400',
            rejected: 'bg-red-500/20 text-red-400',
            sold: 'bg-blue-500/20 text-blue-400'
        };
        const labels = {
            active: 'Faol',
            pending: 'Kutilmoqda',
            rejected: 'Rad etilgan',
            sold: 'Sotilgan'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getGameName = (gameId) => {
        const game = games.find(g => g.id === gameId);
        return game?.name || gameId;
    };

    const handleApprove = (listing) => {
        const updatedListings = listings.map(l => {
            if (l.id === listing.id) {
                return { ...l, status: 'active', approvedAt: new Date().toISOString() };
            }
            return l;
        });
        localStorage.setItem('wibeListings', JSON.stringify(updatedListings));
        setListings(updatedListings);
        setMessage({ type: 'success', text: `"${listing.title}" tasdiqlandi!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleReject = (listing) => {
        if (!window.confirm(`"${listing.title}" ni rad etmoqchimisiz?`)) return;

        const updatedListings = listings.map(l => {
            if (l.id === listing.id) {
                return { ...l, status: 'rejected', rejectedAt: new Date().toISOString() };
            }
            return l;
        });
        localStorage.setItem('wibeListings', JSON.stringify(updatedListings));
        setListings(updatedListings);
        setMessage({ type: 'success', text: `"${listing.title}" rad etildi!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleDelete = (listing) => {
        if (!window.confirm(`"${listing.title}" ni o'chirmoqchimisiz?`)) return;

        const updatedListings = listings.filter(l => l.id !== listing.id);
        localStorage.setItem('wibeListings', JSON.stringify(updatedListings));
        setListings(updatedListings);
        setMessage({ type: 'success', text: `E'lon o'chirildi!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const viewCredentials = (listing) => {
        setSelectedListing(listing);
        setShowCredentials(true);
        setShowPassword(false);
    };

    const filteredListings = listings.filter(listing => {
        const matchesStatus = selectedStatus === 'all' || listing.status === selectedStatus;
        const matchesSearch = listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.sellerName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const pendingCount = listings.filter(l => l.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Akkauntlar</h1>
                    <p className="text-gray-400 text-sm">Foydalanuvchi e'lonlarini boshqaring</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadListings}
                        className="p-2 bg-[#1e1e32] text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Yangilash"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    {pendingCount > 0 && (
                        <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                            {pendingCount} ta kutilmoqda
                        </span>
                    )}
                </div>
            </div>

            {/* Success/Error Message */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                    <Check className="w-5 h-5" />
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Akkaunt yoki sotuvchi qidirish..."
                        className="w-full pl-12 pr-4 py-3 bg-[#1e1e32] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setSelectedStatus(filter.value)}
                            className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedStatus === filter.value
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-[#1e1e32] text-gray-300 hover:bg-[#25253a]'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1e1e32] rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left text-xs text-gray-500 font-medium p-4">ID</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Akkaunt</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">O'yin</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Sotuvchi</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Narx</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Status</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Sana</th>
                                <th className="text-left text-xs text-gray-500 font-medium p-4">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredListings.length > 0 ? (
                                filteredListings.map((listing) => (
                                    <tr key={listing.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-500 text-sm">#{listing.id}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-white text-sm">{listing.title}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Level: {listing.level || '-'} | Rank: {listing.rank || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">{getGameName(listing.gameId)}</td>
                                        <td className="p-4">
                                            <span className="text-sm text-white">{listing.sellerName}</span>
                                        </td>
                                        <td className="p-4 text-cyan-400 text-sm font-medium">
                                            {formatPrice(Number(listing.price))}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(listing.status)}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {new Date(listing.createdAt).toLocaleDateString('uz-UZ')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                {/* View Credentials */}
                                                <button
                                                    onClick={() => viewCredentials(listing)}
                                                    className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                                                    title="Login/Parol ko'rish"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>

                                                {listing.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(listing)}
                                                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                                            title="Tasdiqlash"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(listing)}
                                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                            title="Rad etish"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {listing.status === 'active' && (
                                                    <button
                                                        onClick={() => handleReject(listing)}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                        title="Bloklash"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(listing)}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="O'chirish"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400">Hech qanday e'lon topilmadi</p>
                                        <p className="text-gray-500 text-sm mt-1">Foydalanuvchilar e'lon qo'shganda bu yerda ko'rinadi</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <div className="text-sm text-gray-500">
                        {filteredListings.length} ta akkaunt topildi
                    </div>
                </div>
            </div>

            {/* Credentials Modal */}
            {showCredentials && selectedListing && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e32] rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <Key className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Akkaunt ma'lumotlari</h3>
                                    <p className="text-gray-400 text-sm">{selectedListing.title}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCredentials(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Login Method */}
                            <div className="p-4 bg-[#25253a] rounded-xl">
                                <label className="text-xs text-gray-500 block mb-1">Kirish usuli</label>
                                <p className="text-white font-medium">{selectedListing.loginMethod || 'Email'}</p>
                            </div>

                            {/* Email/Login */}
                            <div className="p-4 bg-[#25253a] rounded-xl">
                                <label className="text-xs text-gray-500 block mb-1">Email / Login</label>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-medium font-mono">{selectedListing.accountEmail}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(selectedListing.accountEmail)}
                                        className="text-purple-400 text-sm hover:underline"
                                    >
                                        Nusxalash
                                    </button>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="p-4 bg-[#25253a] rounded-xl">
                                <label className="text-xs text-gray-500 block mb-1">Parol</label>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-medium font-mono">
                                        {showPassword ? selectedListing.accountPassword : '••••••••••'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(selectedListing.accountPassword)}
                                            className="text-purple-400 text-sm hover:underline"
                                        >
                                            Nusxalash
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            {selectedListing.additionalInfo && (
                                <div className="p-4 bg-[#25253a] rounded-xl">
                                    <label className="text-xs text-gray-500 block mb-1">Qo'shimcha ma'lumot</label>
                                    <p className="text-white text-sm">{selectedListing.additionalInfo}</p>
                                </div>
                            )}

                            {/* Seller Info */}
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                                <label className="text-xs text-purple-400 block mb-1">Sotuvchi</label>
                                <p className="text-white font-medium">{selectedListing.sellerName}</p>
                                <p className="text-gray-400 text-sm">ID: {selectedListing.sellerId}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            {selectedListing.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            handleApprove(selectedListing);
                                            setShowCredentials(false);
                                        }}
                                        className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        Tasdiqlash
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleReject(selectedListing);
                                            setShowCredentials(false);
                                        }}
                                        className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X className="w-5 h-5" />
                                        Rad etish
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowCredentials(false)}
                                className="flex-1 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccounts;
