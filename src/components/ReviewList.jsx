import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react';
import { getDisplayInitial } from '../lib/displayUtils';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../lib/apiClient';

const ReviewList = ({ userId, type = 'received' }) => {
    const { t } = useLanguage();

    const { data, isLoading } = useQuery({
        queryKey: ['reviews', 'user', userId, type],
        queryFn: async () => {
            const { data } = await apiClient.get(`/reviews/user/${userId}/`, {
                params: { type },
            });
            return data;
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    });

    const reviews = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getAverageRating = () => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0);
        return (total / reviews.length).toFixed(1);
    };

    if (isLoading) {
        return (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {t('common.loading') || 'Yuklanmoqda...'}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="empty-state">
                <MessageSquare className="empty-state-icon" />
                <p className="empty-state-description">
                    {type === 'received'
                        ? t('reviews.empty_received')
                        : t('reviews.empty_given')
                    }
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border-muted)',
                }}
            >
                <div className="text-center">
                    <div
                        style={{
                            fontSize: 'var(--font-size-3xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text-primary)',
                        }}
                    >
                        {getAverageRating()}
                    </div>
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className="w-4 h-4"
                                style={{
                                    color: star <= Math.round(getAverageRating())
                                        ? 'var(--color-premium-gold-light)'
                                        : 'var(--color-text-muted)',
                                    fill: star <= Math.round(getAverageRating()) ? 'currentColor' : 'none',
                                }}
                            />
                        ))}
                    </div>
                </div>
                <div style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                        {reviews.length}
                    </span>{' '}
                    {t('reviews.reviews_count')}
                </div>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((review) => {
                    const reviewer = review.reviewer ?? {};
                    const reviewerName = reviewer.display_name ?? reviewer.name ?? reviewer.username ?? 'User';
                    const createdAt = review.created_at ?? review.createdAt ?? '';
                    const accountTitle = review.listing?.title ?? review.accountTitle ?? null;

                    return (
                        <div
                            key={review.id}
                            style={{
                                padding: 'var(--space-4)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-xl)',
                                border: '1px solid var(--color-border-muted)',
                            }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div
                                    className="avatar avatar-lg"
                                    style={{
                                        backgroundColor: 'var(--color-accent-blue)',
                                        color: '#fff',
                                        flexShrink: 0,
                                    }}
                                >
                                    {getDisplayInitial(reviewerName, 'U')}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-4" style={{ marginBottom: '8px' }}>
                                        <div>
                                            <span
                                                style={{
                                                    fontWeight: 'var(--font-weight-medium)',
                                                    color: 'var(--color-text-primary)',
                                                }}
                                            >
                                                {reviewerName}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'var(--color-text-muted)',
                                                    marginLeft: '8px',
                                                }}
                                            >
                                                {createdAt ? formatDate(createdAt) : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className="w-4 h-4"
                                                    style={{
                                                        color: star <= review.rating
                                                            ? 'var(--color-premium-gold-light)'
                                                            : 'var(--color-text-muted)',
                                                        fill: star <= review.rating ? 'currentColor' : 'none',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Account Info */}
                                    {accountTitle && (
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-muted)',
                                            marginBottom: '8px',
                                        }}>
                                            {t('reviews.account_label')}:{' '}
                                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                                {accountTitle}
                                            </span>
                                        </p>
                                    )}

                                    {/* Comment */}
                                    {review.comment && (
                                        <p style={{
                                            color: 'var(--color-text-secondary)',
                                            lineHeight: 'var(--line-height-base)',
                                        }}>
                                            {review.comment}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReviewList;
