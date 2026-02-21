/**
 * Central export for all hooks
 */

export { useAuth } from '../context/AuthContext';

export { useGames, useGame, useGameListings } from './useGames';
export {
    useListings,
    useListing,
    useCreateListing,
    useUpdateListing,
    useDeleteListing,
    useAddToFavorites,
    useRemoveFromFavorites,
    useTrackView,
} from './useListings';
export {
    useProfile,
    useUpdateProfile,
    useProfileListings,
    useProfileFavorites,
    useProfilePurchases,
    useProfileSales,
    useProfileNotifications,
} from './useProfile';
export {
    useChats,
    useChat,
    useChatMessages,
    useCreateChat,
    useSendMessage,
} from './useChat';
export {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from './useNotifications';
export { useTransactions, useDeposit, useWithdraw } from './usePayments';
export {
    useSubscriptionPlans,
    useMySubscriptions,
    usePurchaseSubscription,
    useCancelSubscription,
} from './useSubscriptions';
export {
    useListingReviews,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useReviewResponse,
    useMarkReviewHelpful,
} from './useReviews';
export { useReports, useCreateReport, useUpdateReport } from './useReports';
export {
    useAdminDashboard,
    useAdminUsers,
    useAdminBanUser,
    useAdminPendingListings,
    useAdminListings,
    useAdminApproveListing,
    useAdminRejectListing,
    useAdminUpdateListing,
    useAdminReports,
    useAdminResolveReport,
    useAdminDisputes,
    useAdminResolveDispute,
    useAdminTransactions,
} from './useAdmin';
export { useUploadImage, useUploadImages } from './useUpload';
export { useWebSocket, useChatWebSocket, useNotificationWebSocket } from './useWebSocket';
