import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { CoinProvider } from './context/CoinContext';
import { LanguageProvider } from './context/LanguageContext';
import ToastProvider from './components/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard, { AdminGuard, GuestGuard } from './components/AuthGuard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import CommandPalette from './components/CommandPalette';
import ScrollToTop from './components/ScrollToTop';

// Lazy-loaded pages for code-splitting & performance
const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const TopAccountsPage = lazy(() => import('./pages/TopAccountsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SellPage = lazy(() => import('./pages/SellPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const CoinsPage = lazy(() => import('./pages/CoinsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminPremium = lazy(() => import('./pages/admin/AdminPremium'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Page loading fallback with skeleton shimmer
const PageLoader = () => (
  <div
    className="animate-fadeIn"
    style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      {/* Pulsing brand icon */}
      <div
        className="skeleton"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl)',
          margin: '0 auto 20px',
        }}
      />
      {/* Skeleton text placeholders */}
      <div
        className="skeleton"
        style={{
          width: '160px',
          height: '14px',
          borderRadius: 'var(--radius-sm)',
          margin: '0 auto 10px',
        }}
      />
      <div
        className="skeleton"
        style={{
          width: '100px',
          height: '10px',
          borderRadius: 'var(--radius-sm)',
          margin: '0 auto',
        }}
      />
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <CoinProvider>
                  <ChatProvider>
                    <NotificationProvider>
                    <Routes>
                      {/* Admin Login - No layout, only for guests */}
                      <Route path="/admin/login" element={
                        <Suspense fallback={<PageLoader />}>
                          <GuestGuard><AdminLogin /></GuestGuard>
                        </Suspense>
                      } />

                      {/* Admin Routes - protected by AdminGuard */}
                      <Route path="/admin" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/accounts" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminAccounts /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/users" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminUsers /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/reports" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminReports /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/premium" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminPremium /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/finance" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminFinance /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />
                      <Route path="/admin/settings" element={
                        <Suspense fallback={<PageLoader />}>
                          <AdminGuard><AdminLayout><AdminSettings /></AdminLayout></AdminGuard>
                        </Suspense>
                      } />

                      {/* Public Routes */}
                      <Route path="/*" element={
                        <div
                          className="min-h-screen"
                          style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          <ScrollToTop />
                          {/* Skip to content for keyboard users */}
                          <a
                            href="#main-content"
                            className="skip-to-content"
                            style={{
                              position: 'absolute',
                              top: '-100%',
                              left: '16px',
                              padding: '8px 16px',
                              backgroundColor: 'var(--color-accent-blue)',
                              color: '#ffffff',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-semibold)',
                              zIndex: 100,
                              textDecoration: 'none',
                              transition: 'top 0.2s ease',
                            }}
                            onFocus={(e) => { e.currentTarget.style.top = '8px'; }}
                            onBlur={(e) => { e.currentTarget.style.top = '-100%'; }}
                          >
                            Skip to content
                          </a>
                          <Navbar />
                          <main id="main-content" role="main" style={{ paddingTop: '64px' }}>
                            <Suspense fallback={<PageLoader />}>
                              <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/game/:gameId" element={<GamePage />} />
                                <Route path="/account/:accountId" element={<AccountDetailPage />} />
                                <Route path="/products" element={<ProductsPage />} />
                                <Route path="/premium" element={<PremiumPage />} />
                                <Route path="/top" element={<TopAccountsPage />} />
                                <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
                                <Route path="/signup" element={<GuestGuard><SignupPage /></GuestGuard>} />
                                <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                                <Route path="/terms" element={<TermsPage />} />
                                <Route path="/sell" element={<AuthGuard><SellPage /></AuthGuard>} />
                                <Route path="/faq" element={<FAQPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
                                <Route path="/statistics" element={<StatisticsPage />} />
                                <Route path="/coins" element={<AuthGuard><CoinsPage /></AuthGuard>} />
                                <Route path="*" element={<NotFoundPage />} />
                              </Routes>
                            </Suspense>
                          </main>
                          <Footer />
                          <ChatWidget />
                          <CommandPalette />
                        </div>
                      } />
                    </Routes>
                  </NotificationProvider>
                </ChatProvider>
              </CoinProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
