// EcoX API Service Layer
// Real HTTP client connecting to FastAPI backend at http://localhost:8000/api/v1

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Token Storage Keys
const TOKEN_KEY = 'ecox_access_token';
const REFRESH_TOKEN_KEY = 'ecox_refresh_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Generic fetch wrapper with Bearer token injection and error handling
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAccessToken();

    const headers = {
        ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const errorMsg = data?.detail || `Request failed with status ${response.status}`;
            const error = new Error(errorMsg);
            error.code = data?.code || 'API_ERROR';
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (err) {
        // If connection refused, provide helpful message
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('Cannot connect to EcoX backend server (http://localhost:8000). Please ensure it is running.');
        }
        throw err;
    }
}

// ============================================================
// AUTHENTICATION
// ============================================================

export const loginUser = async (emailOrUsername, password) => {
    const tokenData = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            username_or_email: emailOrUsername,
            password: password,
        }),
    });

    setTokens(tokenData.access_token, tokenData.refresh_token);

    // Fetch user profile with the newly set token
    const user = await getMe();
    return {
        ...user,
        // Map backend snake_case to frontend camelCase expectations
        name: user.username,
        ecoPoints: user.eco_points,
    };
};

export const adminLoginUser = async (emailOrUsername, password) => {
    const tokenData = await request('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
            username_or_email: emailOrUsername,
            password: password,
        }),
    });

    setTokens(tokenData.access_token, tokenData.refresh_token);

    const user = await getMe();
    return {
        ...user,
        name: user.username,
        ecoPoints: user.eco_points,
    };
};

export const registerUser = async (userData) => {
    // Generate valid username from name or email
    const username = userData.username ||
        userData.name?.toLowerCase().replace(/\s+/g, '_') ||
        userData.email.split('@')[0];

    const registered = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email: userData.email,
            username: username,
            password: userData.password,
        }),
    });

    // Automatically log in after registration
    return await loginUser(userData.email, userData.password);
};

export const getMe = async () => {
    const user = await request('/auth/me');
    return {
        ...user,
        name: user.username,
        ecoPoints: user.eco_points,
    };
};

export const logoutUserAPI = () => {
    clearTokens();
};

export const getMyStats = async () => {
    return await request('/users/me/stats');
};

// ============================================================
// CHALLENGES
// ============================================================

export const getChallengesAPI = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') {
        query.append('category', params.category.toLowerCase());
    }
    if (params.difficulty) query.append('difficulty', params.difficulty.toLowerCase());
    if (params.is_active !== undefined) query.append('is_active', params.is_active);
    query.append('size', params.size || 50);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const pageData = await request(`/challenges${queryString}`);

    // Map backend ChallengeRead format to frontend expected card format
    const categoryEmojis = {
        transport: '🚍',
        energy: '⚡',
        waste: '♻️',
        water: '💧',
        food: '🥗',
        other: '🌳',
    };

    const items = Array.isArray(pageData) ? pageData : (pageData?.items || pageData?.challenges || []);
    return items.map((ch) => {
        const reqs = ch.verification_requirements || {};
        const methods = Object.entries(reqs)
            .filter(([_, v]) => Boolean(v))
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

        return {
            id: ch.id,
            title: ch.title,
            description: ch.description,
            longDescription: ch.description,
            category: ch.category ? ch.category.charAt(0).toUpperCase() + ch.category.slice(1) : 'General',
            ecoPoints: ch.points_reward,
            co2Reduction: ch.co2_saved_kg,
            difficulty: ch.difficulty ? ch.difficulty.charAt(0).toUpperCase() + ch.difficulty.slice(1) : 'Easy',
            active: ch.is_active,
            emoji: categoryEmojis[(ch.category || '').toLowerCase()] || '🌱',
            verificationRequirements: ch.verification_requirements,
            verificationMethod: methods.length > 0 ? methods : ['Photo', 'Timestamp'],
            createdAt: ch.created_at,
        };
    });
};

export const getChallengeByIdAPI = async (id) => {
    return await request(`/challenges/${id}`);
};

export const createChallengeAPI = async (challengeData) => {
    return await request('/challenges', {
        method: 'POST',
        body: JSON.stringify(challengeData),
    });
};

// ============================================================
// CARBON CALCULATION & RECORDS
// ============================================================

export const saveCarbonRecordAPI = async (recordData) => {
    return await request('/carbon/records', {
        method: 'POST',
        body: JSON.stringify(recordData),
    });
};

export const getCarbonRecordsAPI = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const q = query ? `?${query}` : '';
    return await request(`/carbon/records${q}`);
};

export const getCarbonSummaryAPI = async (period = 'month') => {
    return await request(`/carbon/summary?period=${period}`);
};

export const getCarbonTimeseriesAPI = async (period = 'month') => {
    return await request(`/carbon/timeseries?period=${period}`);
};

export const deleteCarbonRecordAPI = async (id) => {
    return await request(`/carbon/records/${id}`, {
        method: 'DELETE',
    });
};

export const getReductionPlanAPI = async (diet = null) => {
    const q = diet ? `?diet=${encodeURIComponent(diet)}` : '';
    return await request(`/carbon/reduction-plan${q}`);
};

// Comprehensive carbon calculator connecting frontend inputs to backend API
export const calculateCarbonAPI = async (inputs) => {
    // If logged in, record the emissions in the backend
    const token = getAccessToken();

    const activityMappings = [
        { key: 'carKmPerWeek', category: 'transport', activity: 'car_commute', unit: 'km', multiplier: 4.33 },
        { key: 'bikeKmPerWeek', category: 'transport', activity: 'motorcycle', unit: 'km', multiplier: 4.33 },
        { key: 'busKmPerWeek', category: 'transport', activity: 'bus', unit: 'km', multiplier: 4.33 },
        { key: 'trainKmPerWeek', category: 'transport', activity: 'train', unit: 'km', multiplier: 4.33 },
        { key: 'electricityUnitsPerMonth', category: 'energy', activity: 'electricity_grid', unit: 'kwh', multiplier: 1 },
        { key: 'wasteKgPerWeek', category: 'waste', activity: 'waste_landfill', unit: 'kg', multiplier: 4.33 },
    ];

    if (token) {
        for (const item of activityMappings) {
            const val = parseFloat(inputs[item.key]);
            if (val > 0) {
                try {
                    await saveCarbonRecordAPI({
                        category: item.category,
                        activity_type: item.activity,
                        quantity: val * item.multiplier,
                        unit: item.unit,
                    });
                } catch {
                    // Continue recording other categories if one fails
                }
            }
        }
    }

    // Return the calculated footprint data for charts
    const transportMonthly = (
        (parseFloat(inputs.carKmPerWeek || 0) * 0.171 +
         parseFloat(inputs.bikeKmPerWeek || 0) * 0.103 +
         parseFloat(inputs.busKmPerWeek || 0) * 0.089 +
         parseFloat(inputs.trainKmPerWeek || 0) * 0.035) * 4.33
    );

    const electricityMonthly = parseFloat(inputs.electricityUnitsPerMonth || 0) * 0.420;
    const wasteMonthly = parseFloat(inputs.wasteKgPerWeek || 0) * 0.580 * 4.33;

    const foodFactors = { vegan: 40, vegetarian: 70, mixed: 150, meat_heavy: 250 };
    const foodMonthly = foodFactors[inputs.foodType] || 150;

    const total = transportMonthly + electricityMonthly + wasteMonthly + foodMonthly;

    return {
        totalMonthly: Math.round(total),
        totalAnnual: Math.round(total * 12),
        breakdown: {
            transport: Math.round(transportMonthly),
            electricity: Math.round(electricityMonthly),
            waste: Math.round(wasteMonthly),
            food: Math.round(foodMonthly),
        },
        calculatedAt: new Date().toISOString(),
    };
};

// ============================================================
// BADGES
// ============================================================

export const getBadgesAPI = async () => {
    const badges = await request('/badges');
    return (Array.isArray(badges) ? badges : []).map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        emoji: b.icon_url || '🏅',
        iconUrl: b.icon_url,
        criteriaType: b.criteria_type,
        criteriaValue: b.criteria_value,
        rarity: b.criteria_value >= 1000 ? 'Legendary' : b.criteria_value >= 500 ? 'Epic' : b.criteria_value >= 100 ? 'Rare' : 'Common',
        points: b.criteria_type === 'points_total' ? b.criteria_value : 50,
    }));
};

export const getMyBadgesAPI = async () => {
    const userBadges = await request('/badges/me');
    return (Array.isArray(userBadges) ? userBadges : []).map((ub) => ({
        ...ub,
        badge: {
            ...ub.badge,
            emoji: ub.badge?.icon_url || '🏅',
            rarity: ub.badge?.criteria_value >= 1000 ? 'Legendary' : ub.badge?.criteria_value >= 500 ? 'Epic' : ub.badge?.criteria_value >= 100 ? 'Rare' : 'Common',
            points: ub.badge?.criteria_type === 'points_total' ? ub.badge?.criteria_value : 50,
        },
    }));
};

// ============================================================
// LEADERBOARD
// ============================================================

export const getLeaderboardAPI = async (limit = 50) => {
    const list = await request(`/leaderboard?limit=${limit}`);
    return (Array.isArray(list) ? list : []).map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        name: entry.name || entry.username,
        username: entry.username,
        college: entry.college || 'TCET Mumbai',
        ecoPoints: entry.eco_points,
        co2Reduced: entry.co2_saved_kg,
        challengesCompleted: entry.challenges_completed,
    }));
};

// ============================================================
// SUBMISSIONS
// ============================================================

export const submitProofAPI = async (submissionData) => {
    const isFormData = submissionData instanceof FormData;
    return await request('/submissions', {
        method: 'POST',
        body: isFormData ? submissionData : JSON.stringify(submissionData),
    });
};

export const getMySubmissionsAPI = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const q = query ? `?${query}` : '';
    const items = await request(`/submissions/me${q}`);
    return (Array.isArray(items) ? items : []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        challengeId: s.challenge_id,
        status: s.status,
        proofPhoto: s.image_url || s.photo_url,
        image_url: s.image_url || s.photo_url,
        photo_url: s.photo_url,
        is_flagged: Boolean(s.is_flagged),
        flag_reason: s.flag_reason,
        latitude: s.latitude,
        longitude: s.longitude,
        capturedAt: s.captured_at,
        submittedAt: s.captured_at,
        pointsAwarded: s.points_awarded,
        ecoPoints: s.points_awarded,
    }));
};

export const getSubmissionsAPI = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const q = query ? `?${query}` : '';
    const items = await request(`/submissions${q}`);
    return (Array.isArray(items) ? items : []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        challengeId: s.challenge_id,
        status: s.status,
        proofPhoto: s.image_url || s.photo_url,
        image_url: s.image_url || s.photo_url,
        photo_url: s.photo_url,
        is_flagged: Boolean(s.is_flagged),
        flag_reason: s.flag_reason,
        latitude: s.latitude,
        longitude: s.longitude,
        capturedAt: s.captured_at,
        submittedAt: s.captured_at,
        pointsAwarded: s.points_awarded,
        ecoPoints: s.points_awarded,
        user: s.user,
        challenge: s.challenge,
    }));
};

export const verifySubmissionAPI = async ({ submission_id, decision, note }) => {
    return await request('/submissions/verify', {
        method: 'POST',
        body: JSON.stringify({
            submission_id,
            decision,
            note,
        }),
    });
};

export const getSubmissionByIdAPI = async (id) => {
    return await request(`/submissions/${id}`);
};

