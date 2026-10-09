// LocalStorage utility functions for EcoX
// FUTURE: These will be replaced with Spring Boot REST API calls

const PREFIX = 'ecox_';

export const getStorage = (key) => {
    try {
        const item = localStorage.getItem(PREFIX + key);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
};

export const setStorage = (key, value) => {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
};

export const removeStorage = (key) => {
    localStorage.removeItem(PREFIX + key);
};

export const clearAllEcoX = () => {
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    });
};

// --- Auth helpers ---
export const getCurrentUser = () => getStorage('currentUser');

export const setCurrentUser = (user) => setStorage('currentUser', user);

export const logoutUser = () => removeStorage('currentUser');

// --- User management ---
export const getUsers = () => getStorage('users') || [];

export const saveUser = (user) => {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
        users[idx] = user;
    } else {
        users.push(user);
    }
    setStorage('users', users);
};

export const updateUser = (userId, updates) => {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx >= 0) {
        users[idx] = { ...users[idx], ...updates };
        setStorage('users', users);
        // Also update currentUser if it's the same
        const current = getCurrentUser();
        if (current && current.id === userId) {
            setCurrentUser({ ...current, ...updates });
        }
        return users[idx];
    }
    return null;
};

export const getUserById = (id) => {
    const users = getUsers();
    return users.find((u) => u.id === id) || null;
};

// --- Points management ---
export const addPoints = (userId, points) => {
    return updateUser(userId, {
        ecoPoints: (getUserById(userId)?.ecoPoints || 0) + points,
    });
};

// --- Carbon calculation ---
export const saveCalcResult = (result) => setStorage('lastCalcResult', result);

export const getCalcResult = () => getStorage('lastCalcResult');

// --- Challenges ---
export const getChallenges = () => getStorage('challenges') || null;

export const saveChallenges = (challenges) => setStorage('challenges', challenges);

// --- Submissions ---
export const getSubmissions = () => getStorage('submissions') || [];

export const saveSubmission = (submission) => {
    const submissions = getSubmissions();
    const idx = submissions.findIndex((s) => s.id === submission.id);
    if (idx >= 0) {
        submissions[idx] = submission;
    } else {
        submissions.push(submission);
    }
    setStorage('submissions', submissions);
};

export const getSubmissionById = (id) => {
    return getSubmissions().find((s) => s.id === id) || null;
};

export const getUserSubmissions = (userId) => {
    return getSubmissions().filter((s) => s.userId === userId);
};

// --- Leaderboard ---
export const getLeaderboard = () => getStorage('leaderboard') || null;

export const saveLeaderboard = (board) => setStorage('leaderboard', board);

export const updateLeaderboardEntry = (userId, updates) => {
    const board = getLeaderboard() || [];
    const idx = board.findIndex((e) => e.id === userId);
    if (idx >= 0) {
        board[idx] = { ...board[idx], ...updates };
    } else {
        board.push({ id: userId, ...updates });
    }
    // Re-sort by ecoPoints desc
    board.sort((a, b) => b.ecoPoints - a.ecoPoints);
    board.forEach((e, i) => { e.rank = i + 1; });
    saveLeaderboard(board);
    return board;
};

// --- Competition ---
export const getCompetition = () => getStorage('competition') || null;

export const saveCompetition = (data) => setStorage('competition', data);

// --- Unlocked Badges ---
export const getUnlockedBadges = (userId) => {
    const all = getStorage('unlockedBadges') || {};
    return all[userId] || [];
};

export const unlockBadge = (userId, badgeId) => {
    const all = getStorage('unlockedBadges') || {};
    const userBadges = all[userId] || [];
    if (!userBadges.includes(badgeId)) {
        userBadges.push(badgeId);
        all[userId] = userBadges;
        setStorage('unlockedBadges', all);
        return true; // newly unlocked
    }
    return false;
};

// --- Generate unique ID ---
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
