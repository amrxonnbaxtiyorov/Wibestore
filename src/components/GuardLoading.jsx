/**
 * Umumiy yuklanish ko'rinishi — AuthGuard, AdminGuard, GuestGuard uchun
 */
const GuardLoading = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
  </div>
);

export default GuardLoading;
