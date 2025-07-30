require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // Use require for older Node.js or if you prefer
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID;
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;
const OSU_REDIRECT_URI = process.env.OSU_REDIRECT_URI;

// Store access tokens (in a real application, you'd use a database for persistence)
let accessToken = null;
let tokenExpiry = 0; // Timestamp when the token expires

// Function to get a new access token
async function getAccessToken() {
    // If we have a token and it's not expired, return it
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    console.log('Fetching new osu! API v2 access token...');
    const response = await fetch('https://osu.ppy.sh/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            client_id: OSU_CLIENT_ID,
            client_secret: OSU_CLIENT_SECRET,
            grant_type: 'client_credentials', // For public data access
            scope: 'public' // Basic scope for user data
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get access token:', response.status, errorData);
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Store expiry with a 1-minute buffer
    console.log('New access token obtained.');
    return accessToken;
}

// Middleware to ensure we have an active access token
app.use(async (req, res, next) => {
    try {
        if (!accessToken || Date.now() >= tokenExpiry) {
            await getAccessToken();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
});

// Serve static files (your index.html and index.js)
app.use(express.static(path.join(__dirname, '')));

// API endpoint to search for a user
app.get('/api/user/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    try {
        // Search for the user to get their ID (osu! API v2 user search is by ID or exact username)
        // Note: The /users endpoint is preferred for getting user details by ID or username
        // The /search endpoint is for general search, but user search is better done directly.
        // For exact username search, you can use the /users/{user} endpoint directly.
        // If you need "fuzzy" search, you'd need the /search endpoint. For this example,
        // we'll assume exact username or try to get ID first if needed.

        // A direct lookup by username is available
        const userResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(username)}/osu`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (userResponse.status === 404) {
            return res.status(404).json({ error: `User "${username}" not found.` });
        }
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error(`Error fetching user data for ${username}:`, userResponse.status, errorText);
            return res.status(userResponse.status).json({ error: `Failed to fetch user data: ${userResponse.statusText}` });
        }

        const userData = await userResponse.json();

        // Fetch best performance plays
        const bestPlaysResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${userData.id}/scores/best?limit=5`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!bestPlaysResponse.ok) {
            const errorText = await bestPlaysResponse.text();
            console.error(`Error fetching best plays for user ID ${userData.id}:`, bestPlaysResponse.status, errorText);
            // Don't return error immediately if best plays fail, just log and send user data
            // return res.status(bestPlaysResponse.status).json({ error: `Failed to fetch best plays: ${bestPlaysResponse.statusText}` });
        }

        const bestPlaysData = bestPlaysResponse.ok ? await bestPlaysResponse.json() : [];

        res.json({ user: userData, bestPlays: bestPlaysData });

    } catch (error) {
        console.error('Error in /api/user/:username:', error);
        res.status(500).json({ error: 'Internal server error.', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/index.html in your browser.`);
});
