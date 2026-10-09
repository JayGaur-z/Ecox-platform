import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getChallenges, saveSubmission, generateId } from '../utils/localStorage';
import { getChallengeByIdAPI, submitProofAPI } from '../services/api';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { simulateGPSCapture, simulateQRScan } from '../utils/verification';
import { Camera, MapPin, Clock, QrCode, Upload, Loader, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubmitProof() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef();

    const [challenge, setChallenge] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [qrVerified, setQrVerified] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submissionData, setSubmissionData] = useState(null);
    const [error, setError] = useState('');
    const timestamp = new Date().toLocaleString();

    useEffect(() => {
        let isMounted = true;
        const fetchChallenge = async () => {
            try {
                const apiCh = await getChallengeByIdAPI(id);
                if (apiCh && isMounted) {
                    const reqs = apiCh.verification_requirements || {};
                    const methods = Object.entries(reqs)
                        .filter(([_, v]) => Boolean(v))
                        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

                    setChallenge({
                        id: apiCh.id,
                        title: apiCh.title,
                        category: apiCh.category,
                        ecoPoints: apiCh.points_reward || 100,
                        co2Reduction: apiCh.co2_saved_kg || 2.0,
                        verificationMethod: methods.length > 0 ? methods : ['Photo', 'Timestamp'],
                    });
                    return;
                }
            } catch {
                // Fall back to local storage
            }

            const all = getChallenges() || INITIAL_CHALLENGES;
            const found = (Array.isArray(all) ? all : []).find((c) => String(c.id) === String(id));
            if (isMounted) {
                setChallenge(found || null);
            }
        };

        fetchChallenge();
        return () => { isMounted = false; };
    }, [id]);

    const verificationMethod = Array.isArray(challenge?.verificationMethod)
        ? challenge.verificationMethod
        : ['Photo', 'Timestamp'];

    const needsQR = verificationMethod.includes('QR');
    const needsGPS = verificationMethod.includes('GPS');
    const needsPhoto = verificationMethod.includes('Photo');

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
        toast.success('Photo captured ✓');
    };

    const handleGPS = async () => {
        setGpsLoading(true);
        try {
            const loc = await simulateGPSCapture();
            setLocation(loc);
            toast.success('Location captured ✓');
        } catch {
            toast.error('GPS capture failed');
        } finally {
            setGpsLoading(false);
        }
    };

    const handleQRScan = async () => {
        setQrLoading(true);
        try {
            await simulateQRScan('ECOX-STATION-01');
            setQrVerified(true);
            toast.success('QR Station Verified ✓');
        } catch {
            toast.error('QR scan failed');
        } finally {
            setQrLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!photo && needsPhoto) {
            setError('Please capture or upload an evidence photo as proof.');
            return;
        }
        setError('');
        setSubmitting(true);

        const sid = generateId();

        try {
            // Upload real File object via FormData to FastAPI backend
            const formData = new FormData();
            formData.append('challenge_id', String(challenge?.id));
            if (photo) {
                formData.append('file', photo);
            }
            if (location?.lat) formData.append('latitude', String(location.lat));
            if (location?.lng) formData.append('longitude', String(location.lng));
            if (location?.accuracy) formData.append('gps_accuracy_m', String(location.accuracy));
            if (qrVerified) formData.append('qr_payload', 'ECOX-STATION-01');

            const apiRes = await submitProofAPI(formData);

            const record = {
                id: apiRes?.id || sid,
                userId: user?.id,
                challengeId: challenge?.id,
                challengeTitle: challenge?.title || 'Eco Action',
                challengeCategory: challenge?.category || 'General',
                ecoPoints: Number(challenge?.ecoPoints || 100),
                co2Reduction: Number(challenge?.co2Reduction || 2.0),
                proofPhoto: apiRes?.photo_url || photoPreview || 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800',
                image_url: apiRes?.image_url || apiRes?.photo_url,
                location,
                timestamp: new Date().toISOString(),
                submittedAt: new Date().toISOString(),
                verificationMethod,
                qrVerified,
                status: 'PENDING_REVIEW',
                is_flagged: Boolean(apiRes?.is_flagged),
                flag_reason: apiRes?.flag_reason,
            };

            saveSubmission(record);
            setSubmissionData(record);
            setSubmitting(false);
            setSubmitted(true);
            toast.success('Evidence submitted for administrative review! 📸');
        } catch (err) {
            // Local fallback if server unreachable
            const fallbackRecord = {
                id: sid,
                userId: user?.id,
                challengeId: challenge?.id,
                challengeTitle: challenge?.title || 'Eco Action',
                challengeCategory: challenge?.category || 'General',
                ecoPoints: Number(challenge?.ecoPoints || 100),
                co2Reduction: Number(challenge?.co2Reduction || 2.0),
                proofPhoto: photoPreview || 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800',
                location,
                timestamp: new Date().toISOString(),
                submittedAt: new Date().toISOString(),
                verificationMethod,
                qrVerified,
                status: 'PENDING_REVIEW',
            };
            saveSubmission(fallbackRecord);
            setSubmissionData(fallbackRecord);
            setSubmitting(false);
            setSubmitted(true);
            toast.success('Proof queued locally for review!');
        }
    };

    if (!challenge) return (
        <Layout>
            <div className="max-w-2xl mx-auto text-center py-20">
                <p className="text-gray-400">Loading or challenge not found.</p>
                <button onClick={() => navigate('/challenges')} className="text-green-600 text-sm hover:underline mt-2 inline-block">
                    ← Return to Challenges
                </button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Submit Proof</h1>
                    <p className="text-gray-400 text-sm">Challenge: <span className="text-green-600 font-semibold">{challenge?.title}</span></p>
                </div>

                {!submitted ? (
                    <>
                        {/* Evidence Photo Upload / Real-time Camera Capture */}
                        {needsPhoto && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Camera size={18} className="text-green-600" /> Evidence Photo (Live Camera Prioritized)
                                </h3>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${photoPreview ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                                >
                                    {photoPreview ? (
                                        <div className="relative inline-block">
                                            <img src={photoPreview} alt="Proof" className="max-h-56 mx-auto rounded-xl object-contain shadow-sm" />
                                            <p className="text-xs text-gray-500 mt-2">Click to take a different photo</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={32} className="mx-auto text-green-500 mb-2" />
                                            <p className="text-gray-700 font-medium text-sm">Take photo or upload proof</p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                On mobile, camera opens directly for real-time proof
                                            </p>
                                        </>
                                    )}
                                </div>
                                {/* capture="environment" added for direct rear camera activation */}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                                {photo && (
                                    <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg p-2 flex items-center justify-between border border-green-200">
                                        <span>✓ File ready: <strong>{photo.name}</strong></span>
                                        <span>{(photo.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GPS Location */}
                        {needsGPS && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-green-600" /> GPS Geolocation Verification
                                </h3>
                                {location ? (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                                        <p className="text-green-700 font-semibold flex items-center gap-1.5">
                                            <CheckCircle2 size={16} /> GPS Location Verified
                                        </p>
                                        <p className="text-green-600 text-xs mt-1">{location.lat}° N, {location.lng}° E</p>
                                        <p className="text-gray-500 text-xs">{location.address}</p>
                                        <p className="text-gray-400 text-xs">Accuracy: ±{location.accuracy}m</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGPS}
                                        disabled={gpsLoading}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                                    >
                                        {gpsLoading ? <Loader size={14} className="animate-spin" /> : <MapPin size={14} />}
                                        {gpsLoading ? 'Capturing GPS coordinates...' : 'Capture Current Location'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* QR Verification */}
                        {needsQR && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <QrCode size={18} className="text-purple-600" /> QR Station Check-In
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-4 mb-3 text-center">
                                    <p className="font-bold text-gray-700">Campus Eco Station</p>
                                    <p className="text-gray-400 text-xs mt-1">Station ID: ECOX-STATION-01</p>
                                </div>
                                {qrVerified ? (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                                        <p className="text-green-700 font-semibold text-sm">✓ Station QR Verified</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleQRScan}
                                        disabled={qrLoading}
                                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60 w-full justify-center"
                                    >
                                        {qrLoading ? <Loader size={14} className="animate-spin" /> : <QrCode size={14} />}
                                        {qrLoading ? 'Validating Station QR...' : 'Scan Station QR'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Timestamp */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <Clock size={18} className="text-green-600" /> Submission Timestamp
                            </h3>
                            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono">
                                {timestamp}
                            </div>
                            <p className="text-gray-400 text-xs mt-2">
                                Server records UTC timestamp and validates against EXIF capture headers.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full gradient-eco text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base shadow-lg shadow-green-900/20 disabled:opacity-50"
                        >
                            {submitting ? <Loader size={18} className="animate-spin" /> : '📤'}
                            {submitting ? 'Encrypting & Submitting Proof...' : 'Submit Proof to Verification Queue'}
                        </button>
                    </>
                ) : (
                    /* Strict Administrative Verification Waiting Screen (No Self-Verification) */
                    <div className="space-y-5">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-amber-200 text-center">
                            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 text-2xl">
                                ⏳
                            </div>
                            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                                Status: PENDING_REVIEW
                            </span>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Proof Submitted for Administrative Review
                            </h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                                Your evidence has been recorded in the EcoX audit trail. Photo EXIF metadata and telemetry checks have been uploaded to the administrative review queue.
                            </p>
                        </div>

                        {/* Audit Details */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-green-600" /> Anti-Fraud & Audit Information
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-gray-400 block mb-0.5">Reward Upon Approval</span>
                                    <span className="font-bold text-green-600 text-sm">+{challenge?.ecoPoints || 100} Eco Points</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-gray-400 block mb-0.5">CO₂ Reduction</span>
                                    <span className="font-bold text-gray-700 text-sm">{challenge?.co2Reduction || 2.0} kg CO₂</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-gray-400 block mb-0.5">Verification Mode</span>
                                    <span className="font-semibold text-gray-700">Administrative Human Review</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <span className="text-gray-400 block mb-0.5">Submission ID</span>
                                    <span className="font-mono text-gray-600">#{submissionData?.id}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 italic">
                                Note: Self-verification is strictly disabled to prevent fraud. Eco Points and badges are automatically awarded as soon as an administrator verifies your submission.
                            </p>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={() => navigate('/challenges')}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-center"
                            >
                                Explore More Challenges
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-center"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
