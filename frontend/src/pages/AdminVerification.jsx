import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
    getSubmissions, saveSubmission, updateUser, getUserById, updateLeaderboardEntry,
    getLeaderboard, unlockBadge
} from '../utils/localStorage';
import { getSubmissionsAPI, verifySubmissionAPI } from '../services/api';
import { CheckCircle, XCircle, Eye, X, AlertTriangle, ShieldCheck, Camera, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminVerification() {
    const [submissions, setSubmissions] = useState([]);
    const [viewSub, setViewSub] = useState(null);
    const [filter, setFilter] = useState('all');
    const [rejectNote, setRejectNote] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const getFullImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        const clean = url.startsWith('/') ? url : `/${url}`;
        return `http://localhost:8000${clean}`;
    };

    const isPending = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'PENDING' || st === 'PENDING_REVIEW';
    };

    const isApproved = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'VERIFIED' || st === 'APPROVED';
    };

    const isRejected = (s) => {
        const st = String(s?.status || '').toUpperCase();
        return st === 'REJECTED';
    };

    const load = async () => {
        try {
            const apiSubs = await getSubmissionsAPI();
            const list = Array.isArray(apiSubs) ? apiSubs : (apiSubs?.items || apiSubs?.data || []);
            if (list.length > 0) {
                setSubmissions(list);
                return;
            }
        } catch {
            // fallback to local storage
        }
        const local = getSubmissions();
        setSubmissions(Array.isArray(local) ? local : (local?.items || []));
    };

    useEffect(() => { load(); }, []);

    const safeSubmissions = Array.isArray(submissions) ? submissions : [];
    const filtered = safeSubmissions.filter((s) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return isPending(s);
        if (filter === 'verified') return isApproved(s);
        if (filter === 'rejected') return isRejected(s);
        if (filter === 'flagged') return Boolean(s?.is_flagged);
        return true;
    });

    const doVerify = async (sub) => {
        setIsProcessing(true);
        const isNumericId = Number.isInteger(Number(sub?.id));
        let apiSuccess = false;

        if (isNumericId) {
            try {
                await verifySubmissionAPI({
                    submission_id: Number(sub.id),
                    decision: 'APPROVED',
                    note: 'Verified by administrator.',
                });
                apiSuccess = true;
            } catch (err) {
                console.error('API Verification error:', err);
                toast.error(err.message || 'Failed to verify submission via API');
            }
        }

        // Resilient fallback / local state sync
        const updated = { ...sub, status: 'APPROVED', verifiedAt: new Date().toISOString() };
        saveSubmission(updated);

        // Award points locally if needed
        if (sub?.userId || sub?.user_id) {
            const uid = sub.userId || sub.user_id;
            const u = getUserById(uid);
            if (u) {
                const points = Number(sub?.ecoPoints || sub?.pointsAwarded || 100);
                const co2 = Number(sub?.co2Reduction || 2.0);
                const newPoints = (u.ecoPoints || 0) + points;
                const newCO2 = parseFloat(((u.co2Reduced || 0) + co2).toFixed(1));
                const newChall = (u.challengesCompleted || 0) + 1;
                updateUser(uid, {
                    ecoPoints: newPoints,
                    co2Reduced: newCO2,
                    challengesCompleted: newChall,
                    ecoScore: Math.min(100, Math.round(newPoints / 30))
                });

                const lb = getLeaderboard();
                const safeLb = Array.isArray(lb) ? lb : [];
                const entry = safeLb.find((e) => String(e.id) === String(uid)) || {
                    id: uid, name: u.name, college: u.college, ecoPoints: 0, co2Reduced: 0, challengesCompleted: 0
                };
                updateLeaderboardEntry(uid, {
                    ...entry,
                    ecoPoints: newPoints,
                    co2Reduced: newCO2,
                    challengesCompleted: newChall
                });

                if (newChall >= 1) unlockBadge(uid, 'b-001');
            }
        }

        await load();
        setViewSub(null);
        setIsProcessing(false);
        toast.success(`Submission Approved! +${sub?.ecoPoints || sub?.pointsAwarded || 100} pts & badges awarded ✓`);
    };

    const doReject = async (sub) => {
        setIsProcessing(true);
        const isNumericId = Number.isInteger(Number(sub?.id));

        if (isNumericId) {
            try {
                await verifySubmissionAPI({
                    submission_id: Number(sub.id),
                    decision: 'REJECTED',
                    note: rejectNote.trim() || 'Rejected by administrator.',
                });
            } catch (err) {
                console.error('API Rejection error:', err);
                toast.error(err.message || 'Failed to reject submission via API');
            }
        }

        const updated = {
            ...sub,
            status: 'REJECTED',
            rejectedAt: new Date().toISOString(),
            reviewerNotes: rejectNote.trim() || 'Rejected by administrator.'
        };
        saveSubmission(updated);

        await load();
        setViewSub(null);
        setRejectNote('');
        setIsProcessing(false);
        toast('Submission Rejected', { icon: '✗' });
    };

    const statusBadge = (sub) => {
        if (isApproved(sub)) {
            return <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">✓ Approved</span>;
        }
        if (isRejected(sub)) {
            return <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">✗ Rejected</span>;
        }
        return <span className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">⏳ Pending Review</span>;
    };

    const pendingCount = safeSubmissions.filter(isPending).length;
    const flaggedCount = safeSubmissions.filter((s) => Boolean(s?.is_flagged)).length;

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheck className="text-green-600" size={26} />
                            Administrative Verification Queue
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">
                            Audit evidence-based proofs, inspect EXIF timestamps, and award eco points
                        </p>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap items-center">
                    {[
                        { id: 'all', label: `All (${safeSubmissions.length})` },
                        { id: 'pending', label: `⏳ Pending (${pendingCount})` },
                        { id: 'verified', label: `✓ Approved` },
                        { id: 'rejected', label: `✗ Rejected` },
                        { id: 'flagged', label: `⚠️ Fraud Alerts (${flaggedCount})` },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setFilter(id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === id
                                ? id === 'flagged' ? 'bg-red-600 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="text-4xl mb-3">📋</div>
                            <p className="text-gray-700 font-semibold text-base">No {filter === 'all' ? '' : filter} submissions found.</p>
                            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                                All challenge proofs uploaded by students will appear in this administrative audit queue.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">User</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Challenge & Proof</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Captured</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Anti-Cheat</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(Array.isArray(filtered) ? filtered : []).slice().reverse().map((sub, idx) => {
                                        const userIdStr = String(sub?.userId || sub?.user_id || 'US');
                                        const initials = userIdStr.length >= 2 ? userIdStr.slice(-2).toUpperCase() : userIdStr.toUpperCase();
                                        const title = sub?.challengeTitle || sub?.challenge?.title || `Challenge #${sub?.challenge_id || sub?.challengeId || '1'}`;
                                        const pts = Number(sub?.ecoPoints ?? sub?.pointsAwarded ?? sub?.points_awarded ?? 100);
                                        const dateStr = sub?.submittedAt || sub?.captured_at || sub?.created_at
                                            ? new Date(sub.submittedAt || sub.captured_at || sub.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                            : 'Recent';
                                        const rawImg = sub?.image_url || sub?.proofPhoto || sub?.photo_url || sub?.evidence?.image_url;
                                        const imgUrl = getFullImageUrl(rawImg);

                                        return (
                                            <tr key={sub?.id || idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                                                            {initials}
                                                        </div>
                                                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">#{userIdStr}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {imgUrl ? (
                                                            <img
                                                                src={imgUrl}
                                                                alt="Proof thumbnail"
                                                                className="w-10 h-10 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => setViewSub(sub)}
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                                                <Camera size={16} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{title}</p>
                                                            <p className="text-green-600 text-xs font-medium">+{pts} pts reward</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-gray-500 text-xs hidden md:table-cell">
                                                    {dateStr}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {sub?.is_flagged ? (
                                                        <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 border border-red-200">
                                                            <AlertTriangle size={12} className="text-red-600" />
                                                            Fraud Alert
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                                                            ✓ Verified EXIF
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5">{statusBadge(sub)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => setViewSub(sub)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Inspect Evidence"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {isPending(sub) && (
                                                            <>
                                                                <button
                                                                    disabled={isProcessing}
                                                                    onClick={() => doVerify(sub)}
                                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    title="Approve Submission"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                                <button
                                                                    disabled={isProcessing}
                                                                    onClick={() => {
                                                                        setViewSub(sub);
                                                                    }}
                                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Reject Submission"
                                                                >
                                                                    <XCircle size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Evidence Modal & Decision Dialog */}
                {viewSub && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Evidence Audit</h3>
                                    <p className="text-xs text-gray-400">Submission ID #{viewSub.id} · User #{viewSub.userId || viewSub.user_id}</p>
                                </div>
                                <button
                                    onClick={() => { setViewSub(null); setRejectNote(''); }}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 pt-4">
                                {/* Fraud Alert Banner if flagged */}
                                {viewSub.is_flagged && (
                                    <div className="bg-red-50 border-2 border-red-500/30 text-red-800 p-4 rounded-2xl space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                                            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                                            <span>⚠️ Fraud Alert: Anti-Cheat Triggered</span>
                                        </div>
                                        <p className="text-xs text-red-700 font-medium pl-6">
                                            {viewSub.flag_reason || "Photo taken >2 hours ago or EXIF metadata stripped (possible old photo or screenshot)."}
                                        </p>
                                    </div>
                                )}

                                {/* Challenge info */}
                                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Challenge</p>
                                        <p className="font-bold text-gray-800 text-base">{viewSub.challengeTitle || viewSub.challenge?.title || `Challenge #${viewSub.challenge_id || viewSub.challengeId}`}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Reward</p>
                                        <p className="font-bold text-green-600 text-base">+{viewSub.ecoPoints || viewSub.pointsAwarded || 100} pts</p>
                                    </div>
                                </div>

                                {/* Uploaded Photo Preview from Backend */}
                                {(viewSub.image_url || viewSub.proofPhoto || viewSub.photo_url || viewSub.evidence?.image_url) ? (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                            <Camera size={14} className="text-gray-400" />
                                            Physical Photo Evidence
                                        </p>
                                        <div className="bg-black/5 rounded-2xl overflow-hidden border border-gray-200">
                                            <img
                                                src={getFullImageUrl(viewSub.image_url || viewSub.proofPhoto || viewSub.photo_url || viewSub.evidence?.image_url)}
                                                alt="Submission Evidence"
                                                className="w-full max-h-72 object-contain mx-auto"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 text-sm">
                                        No image file attached
                                    </div>
                                )}

                                {/* Metadata Breakdown */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                                        <div className="text-gray-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>Capture / Upload Time</span>
                                        </div>
                                        <p className="font-semibold text-gray-700">
                                            {viewSub.capturedAt || viewSub.captured_at || viewSub.submittedAt
                                                ? new Date(viewSub.capturedAt || viewSub.captured_at || viewSub.submittedAt).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                                        <div className="text-gray-400 flex items-center gap-1">
                                            <MapPin size={12} />
                                            <span>Location</span>
                                        </div>
                                        <p className="font-semibold text-gray-700">
                                            {viewSub.latitude && viewSub.longitude
                                                ? `${Number(viewSub.latitude).toFixed(4)}°, ${Number(viewSub.longitude).toFixed(4)}°`
                                                : 'Campus Coordinates'}
                                        </p>
                                    </div>
                                </div>

                                {/* Rejection Note Input for pending submissions */}
                                {isPending(viewSub) && (
                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-semibold text-gray-600 block">
                                            Rejection Reason (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={rejectNote}
                                            onChange={(e) => setRejectNote(e.target.value)}
                                            placeholder="e.g. Photo blurry, incorrect proof, or timestamp outdated"
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                    </div>
                                )}

                                {/* Admin Action Buttons */}
                                {isPending(viewSub) ? (
                                    <div className="flex gap-3 pt-3">
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => doVerify(viewSub)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <CheckCircle size={16} /> Approve Submission
                                        </button>
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => doReject(viewSub)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <XCircle size={16} /> Reject Submission
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-xl text-center text-xs text-gray-500 font-medium">
                                        This submission has already been reviewed ({viewSub.status}).
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
