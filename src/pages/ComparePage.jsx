import { useSearchParams, Link } from 'react-router-dom';
import { useCompareListings } from '../hooks';
import { PageHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { formatPrice } from '../data/mockData';

const COMPARE_STORAGE_KEY = 'wibestore_compare_ids';

export const getCompareIds = () => {
    try {
        const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const addToCompare = (id) => {
    const ids = getCompareIds();
    if (ids.includes(id)) return;
    if (ids.length >= 4) ids.shift();
    ids.push(id);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('storage'));
};

export const removeFromCompare = (id) => {
    const ids = getCompareIds().filter((x) => x !== id);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('storage'));
};

const ComparePage = () => {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam
        ? idsParam.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4)
        : getCompareIds();

    const { data, isLoading } = useCompareListings(ids);
    const results = data?.results ?? [];

    return (
        <div className="page-enter" style={{ minHeight: '100vh' }}>
            <div className="gh-container">
                <PageHeader
                    breadcrumbs={[
                        { label: t('common.home'), to: '/' },
                        { label: t('products.title') || 'Products', to: '/products' },
                        { label: t('compare.title') || 'Compare', to: null },
                    ]}
                    title={t('compare.title') || 'Compare accounts'}
                    description={t('compare.description') || 'Compare up to 4 accounts side by side'}
                />
            </div>
            <div className="gh-container">
                {ids.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {t('compare.empty') || 'No accounts to compare. Add accounts from the product page.'}
                        <Link to="/products" className="btn btn-primary" style={{ marginLeft: 12 }}>
                            {t('products.title') || 'Products'}
                        </Link>
                    </p>
                ) : isLoading ? (
                    <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
                ) : results.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>{t('compare.no_results') || 'No valid listings found.'}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table" style={{ minWidth: 600 }}>
                            <thead>
                                <tr>
                                    <th>{t('compare.field') || 'Field'}</th>
                                    {results.map((r) => (
                                        <th key={r.id}>
                                            <Link to={`/account/${r.id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                                {r.title?.slice(0, 30)}{r.title?.length > 30 ? '…' : ''}
                                            </Link>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{t('compare.price') || 'Price'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>{formatPrice(r.price)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>{t('compare.game') || 'Game'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>{r.game?.name ?? '-'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>{t('compare.warranty') || 'Warranty'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>
                                            {r.warranty_days > 0 ? `${r.warranty_days} ${t('common.days') || 'days'}` : '-'}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>{t('compare.level') || 'Level'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>{r.level || '-'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>{t('compare.rank') || 'Rank'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>{r.rank || '-'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>{t('compare.seller') || 'Seller'}</td>
                                    {results.map((r) => (
                                        <td key={r.id}>{r.seller?.full_name || r.seller?.email || '-'}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparePage;
