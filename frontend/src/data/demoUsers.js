// Demo user data — pre-seeded for prototype demonstration
// FUTURE: Replace with Spring Boot REST API calls

export const DEMO_USER = {
    id: 'demo-001',
    name: 'Ayush',
    email: 'demo@ecox.com',
    password: '123456',
    college: 'Thakur College of Engineering and Technology',
    role: 'user',
    ecoPoints: 1240,
    co2Reduced: 24.8,
    challengesCompleted: 8,
    ecoScore: 78,
    streak: 6,
    joinedDate: '2026-08-01',
    avatar: null,
};

export const ADMIN_USER = {
    id: 'admin-001',
    name: 'Admin',
    email: 'admin@ecox.com',
    password: 'admin123',
    college: 'TCET',
    role: 'admin',
};

export const LEADERBOARD_USERS = [
    { id: 'u1', name: 'Aarav', college: 'TCET', ecoPoints: 2450, co2Reduced: 48.2, challengesCompleted: 22, rank: 1 },
    { id: 'u2', name: 'Priya', college: 'TCET', ecoPoints: 2200, co2Reduced: 42.5, challengesCompleted: 19, rank: 2 },
    { id: 'demo-001', name: 'Ayush', college: 'Thakur College of Engineering and Technology', ecoPoints: 1240, co2Reduced: 24.8, challengesCompleted: 8, rank: 3 },
    { id: 'u3', name: 'Rahul', college: 'VJTI', ecoPoints: 1750, co2Reduced: 33.1, challengesCompleted: 15, rank: 4 },
    { id: 'u4', name: 'Sneha', college: 'TSEC', ecoPoints: 1600, co2Reduced: 29.4, challengesCompleted: 13, rank: 5 },
    { id: 'u5', name: 'Kiran', college: 'KJ Somaiya', ecoPoints: 1350, co2Reduced: 26.7, challengesCompleted: 11, rank: 6 },
    { id: 'u6', name: 'Meera', college: 'SPIT', ecoPoints: 1100, co2Reduced: 21.3, challengesCompleted: 9, rank: 7 },
    { id: 'u7', name: 'Arjun', college: 'Thadomal', ecoPoints: 980, co2Reduced: 18.9, challengesCompleted: 8, rank: 8 },
    { id: 'u8', name: 'Divya', college: 'TSEC', ecoPoints: 850, co2Reduced: 16.1, challengesCompleted: 7, rank: 9 },
    { id: 'u9', name: 'Rohan', college: 'SPIT', ecoPoints: 720, co2Reduced: 13.5, challengesCompleted: 6, rank: 10 },
];

export const COLLEGE_TEAMS = [
    { id: 't1', name: 'Team Earth', college: 'TCET', points: 4200, challengesCompleted: 45, co2Reduced: 87.3, members: 12 },
    { id: 't2', name: 'Green Warriors', college: 'VJTI', points: 3850, challengesCompleted: 40, co2Reduced: 75.1, members: 10 },
    { id: 't3', name: 'Eco Titans', college: 'KJ Somaiya', points: 3200, challengesCompleted: 34, co2Reduced: 61.8, members: 9 },
    { id: 't4', name: 'Planet Protectors', college: 'TSEC', points: 2900, challengesCompleted: 30, co2Reduced: 55.4, members: 8 },
];

export const WEEKLY_PROGRESS = [
    { day: 'Mon', co2: 2.1 },
    { day: 'Tue', co2: 3.4 },
    { day: 'Wed', co2: 1.8 },
    { day: 'Thu', co2: 4.2 },
    { day: 'Fri', co2: 5.1 },
    { day: 'Sat', co2: 4.8 },
    { day: 'Sun', co2: 3.4 },
];
