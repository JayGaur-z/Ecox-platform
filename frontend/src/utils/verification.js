// Verification simulation utility
// IMPORTANT: This is a PROTOTYPE VERIFICATION SIMULATION
// FUTURE: Replace with real AI-powered verification engine on Spring Boot backend

/**
 * Simulates proof verification with random confidence scores
 * In real system, this would use image recognition, GPS validation, timestamp analysis
 */
export const simulateVerification = async (submission) => {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { proofPhoto, location, timestamp, verificationMethod } = submission;

    const checks = [];

    if (verificationMethod.includes('Photo') || proofPhoto) {
        checks.push({
            type: 'Photo Evidence',
            status: 'verified',
            confidence: Math.floor(Math.random() * 10) + 88, // 88-97%
            note: 'Image content analyzed.',
        });
    }

    if (verificationMethod.includes('GPS') || location) {
        checks.push({
            type: 'Location Evidence',
            status: 'verified',
            confidence: Math.floor(Math.random() * 8) + 90, // 90-97%
            note: 'GPS coordinates validated.',
        });
    }

    if (timestamp) {
        checks.push({
            type: 'Timestamp Evidence',
            status: 'verified',
            confidence: Math.floor(Math.random() * 5) + 95, // 95-99%
            note: 'Timestamp is recent and valid.',
        });
    }

    if (verificationMethod.includes('QR') && submission.qrVerified) {
        checks.push({
            type: 'QR Station Evidence',
            status: 'verified',
            confidence: 99,
            note: 'QR station scan confirmed.',
        });
    }

    if (verificationMethod.includes('Self Report')) {
        checks.push({
            type: 'Self Report',
            status: 'verified',
            confidence: 80,
            note: 'User self-report accepted.',
        });
    }

    const avgConfidence =
        checks.length > 0
            ? Math.round(checks.reduce((a, b) => a + b.confidence, 0) / checks.length)
            : 75;

    return {
        verified: true,
        confidence: avgConfidence,
        checks,
        verifiedAt: new Date().toISOString(),
        note: 'Prototype Verification Simulation. Real AI verification coming in backend phase.',
    };
};

/**
 * Simulate GPS location capture
 * FUTURE: Use real HTML5 Geolocation API or Spring Boot GPS service
 */
export const simulateGPSCapture = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Simulate Mumbai coordinates with slight variation
    const lat = (19.0760 + (Math.random() - 0.5) * 0.05).toFixed(4);
    const lng = (72.8777 + (Math.random() - 0.5) * 0.05).toFixed(4);
    return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: Math.floor(Math.random() * 10) + 5,
        address: 'Thakur Village, Kandivali East, Mumbai, Maharashtra',
    };
};

/**
 * Simulate QR code scan at eco station
 * FUTURE: Real QR scanner API integration
 */
export const simulateQRScan = async (stationId) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
        scanned: true,
        stationId,
        stationName: 'College Eco Station',
        location: 'TCET Campus, Mumbai',
        timestamp: new Date().toISOString(),
    };
};
