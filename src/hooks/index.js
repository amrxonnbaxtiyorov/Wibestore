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
    useApplyPromo,
} from './useListings';
export {
    useProfile,
    useUpdateProfile,
    useProfileListings,
    useProfileFavorites,
    useProfilePurchases,
    useProfileSales,
    useProfileNotifications,
    useSellerDashboard,
    useReferral,
    useSavedSearches,
    useCreateSavedSearch,
    useDeleteSavedSearch,
} from './useProfile';
export {
    useChats,
    useChat,
    useChatMessages,
    useCreateChat,
    useSendMessage,
    useMarkChatRead,
    useChatSoundEnabled,
    useAdminOrderChats,
} from './useChat';
export {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from './useNotifications';
export {
    useTransactions, useDeposit, useWithdraw, usePurchaseListing,
    useConfirmTrade, useCancelTrade, useTradeStatus,
    useCreateWithdrawal, useWithdrawals,
} from './usePayments';
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
    useAdminFraudStats,
    useAdminUsers,
    useAdminBanUser,
    useAdminPendingListings,
    useAdminAllListings,
    useAdminListings,
    useAdminApproveListing,
    useAdminRejectListing,
    useAdminDeleteListing,
    useAdminUpdateListing,
    useAdminReports,
    useAdminResolveReport,
    useAdminDisputes,
    useAdminResolveDispute,
    useAdminTransactions,
    useAdminGrantSubscription,
    useAdminTelegramStats,
    useAdminTelegramUsers,
    useAdminTelegramUser,
    useAdminUpdateTelegramUser,
    useAdminRegistrationsByDate,
    useAdminDeposits,
    useAdminDeposit,
    useAdminUpdateDeposit,
    useAdminDepositStats,
    useAdminTrades,
    useAdminTrade,
    useAdminTradeStats,
    useAdminCompleteTrade,
    useAdminRefundTrade,
    useAdminResolveTradeDispute,
    useAdminSellerVerifications,
    useAdminApproveVerification,
    useAdminRejectVerification,
    useAdminWithdrawals,
    useAdminApproveWithdrawal,
    useAdminRejectWithdrawal,
} from './useAdmin';
export { useUploadImage, useUploadImages } from './useUpload';
export { useWebSocket, useChatWebSocket, useNotificationWebSocket } from './useWebSocket';
export { useSEO } from './useSEO';
