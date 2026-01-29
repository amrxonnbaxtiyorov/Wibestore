import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import AccountDetailPage from './pages/AccountDetailPage';
import ProductsPage from './pages/ProductsPage';
import PremiumPage from './pages/PremiumPage';
import TopAccountsPage from './pages/TopAccountsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import TermsPage from './pages/TermsPage';
import SellPage from './pages/SellPage';
import FAQPage from './pages/FAQPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPremium from './pages/admin/AdminPremium';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <NotificationProvider>
            <Routes>
              {/* Admin Login - No layout */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/accounts" element={<AdminLayout><AdminAccounts /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
              <Route path="/admin/reports" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/premium" element={<AdminLayout><AdminPremium /></AdminLayout>} />
              <Route path="/admin/finance" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><AdminDashboard /></AdminLayout>} />

              {/* Public Routes */}
              <Route path="/*" element={
                <div className="min-h-screen bg-[#0f0f1a]">
                  <ScrollToTop />
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/game/:gameId" element={<GamePage />} />
                      <Route path="/account/:accountId" element={<AccountDetailPage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/premium" element={<PremiumPage />} />
                      <Route path="/top" element={<TopAccountsPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/sell" element={<SellPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <Footer />
                  <ChatWidget />
                </div>
              } />
            </Routes>
          </NotificationProvider>
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

