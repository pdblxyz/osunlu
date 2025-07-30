// index.js (Replit Backend)
// This file sets up an Express.js server to handle OAuth2 authentication
// and proxy requests to the osu! API v2 securely.

// Load environment variables from .env file.
// In Replit, secrets are automatically loaded as environment variables,
// so a .env file is not strictly necessary but dotenv helps in local development.
require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch'); // Used for making HTTP requests to external APIs
const path = require('path');       // Used for resolving file paths
const cors = require('cors');       // Middleware for enabling Cross-Origin Resource Sharing

const app = express();
const port = process.env.PORT || 3000; // Define the port for the server to listen on

// --- Configuration from Replit Secrets (Environment Variables) ---
// These values should be set in your Replit Repl's "Secrets" tab.
const CLIENT_ID = process.env.OSU_CLIENT_ID;
const CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;
const REDIRECT_URI = process.env.OSU_REDIRECT_URI; // This MUST match your osu! application's registered Redirect URI

// Base URLs for osu! API endpoints
const OSU_API_BASE = 'https://osu.ppy.sh/api/v2';
const OSU_OAUTH_TOKEN_URL = 'https://osu.ppy.sh/oauth/token';

// --- CORS Configuration ---
// This middleware allows your Netlify frontend to make requests to this Replit backend.
// IMPORTANT: The origin is set to your Netlify domain.
app.use(cors({
    origin: 'https://osunlu.xyz', // <--- UPDATED TO YOUR NETLIFY DOMAIN
    methods: ['GET', 'POST'], // Allow GET and POST requests
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow these headers in requests
}));

// Middleware to serve static files from the 'public' directory.
// This is where your frontend HTML, CSS, and client-side JavaScript should reside.
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse incoming JSON request bodies.
app.use(express.json());

// --- OAuth2 Authentication Endpoints ---

/**
 * @route GET /login
 * @description Initiates the osu! OAuth2 authorization flow.
 * Redirects the user's browser to the osu! authorization page.
 */
app.get('/login', (req, res) => {
    // Construct the authorization URL with your client ID, redirect URI, response type, and scope.
    const authorizeUrl = `https://osu.ppy.sh/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=public`;
    console.log('Redirecting to osu! for authorization:', authorizeUrl);
    res.redirect(authorizeUrl); // Redirect the user's browser
});

/**
 * @route GET /callback
 * @description OAuth2 callback endpoint. osu! redirects here after the user authorizes your application.
 * Exchanges the authorization code for an access token and sends it to the frontend.
 */
app.get('/callback', async (req, res) => {
    const code = req.query.code; // The authorization code received from osu!
    if (!code) {
        console.error('Authorization code missing from callback.');
        return res.status(400).send('Authorization code missing.');
    }

    try {
        // Make a POST request to osu!'s token endpoint to exchange the code for an access token.
        const tokenResponse = await fetch(OSU_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET, // Your confidential client secret is used here securely
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI // Must match the one used in the /login redirect
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange error:', tokenResponse.status, errorData);
            return res.status(tokenResponse.status).send(`Failed to obtain access token: ${JSON.stringify(errorData)}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token; // Store refresh token if you plan to implement token refreshing
        const expiresIn = tokenData.expires_in; // Token validity in seconds

        console.log('Successfully obtained access token. Expires in:', expiresIn, 'seconds.');

        // Send a small HTML page back to the client that stores the access token in localStorage
        // and then closes the popup window.
        // In a more robust production app, you might use HTTP-only cookies for session management
        // or store tokens in a database associated with a user session.
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Auth Success</title></head>
            <body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window now.</p>
                <script>
                    // Store the access token in localStorage of the original window (opener)
                    if (window.opener) {
                        window.opener.localStorage.setItem('osu_access_token', '${accessToken}');
                        // Optionally store refresh token if you implement refresh logic
                        // window.opener.localStorage.setItem('osu_refresh_token', '${refreshToken}');
                        window.opener.location.href = '/'; // Redirects the original window to the main app page
                    }
                    window.close(); // Closes the current popup/new tab
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error during OAuth2 callback:', error);
        res.status(500).send('Internal server error during authentication.');
    }
});

// --- API Proxy Endpoints ---
// These endpoints are called by your frontend to securely access osu! API v2.
// The backend acts as a proxy, adding the Authorization header with the access token.

/**
 * @route GET /api/osu/user/:username
 * @description Proxies a request to the osu! API v2 to get user details by username.
 * Requires an access token in the Authorization header from the frontend.
 */
app.get('/api/osu/user/:username', async (req, res) => {
    const username = req.params.username;
    // Extract the access token from the Authorization header sent by the frontend
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
        return res.status(401).send('Access token required for this API call.');
    }

    try {
        // Make the request to the official osu! API v2
        const osuApiResponse = await fetch(`${OSU_API_BASE}/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`, // Use the access token
                'Content-Type': 'application/json'
            }
        });

        if (!osuApiResponse.ok) {
            const errorData = await osuApiResponse.json();
            console.error('osu! API error (user):', osuApiResponse.status, errorData);
            // Forward the error status and message from osu! API to the frontend
            return res.status(osuApiResponse.status).json(errorData);
        }

        const userData = await osuApiResponse.json();
        res.json(userData); // Send the data received from osu! API back to the frontend

    } catch (error) {
        console.error('Error proxying osu! user request:', error);
        res.status(500).send('Internal server error.');
    }
});

/**
 * @route GET /api/osu/user/:userId/scores/best
 * @description Proxies a request to the osu! API v2 to get a user's best performance scores.
 * Requires an access token in the Authorization header from the frontend.
 */
app.get('/api/osu/user/:userId/scores/best', async (req, res) => {
    const userId = req.params.userId;
    const accessToken = req.headers.authorization?.split(' ')[1];
    const mode = req.query.mode || 'osu'; // Default mode is 'osu'
    const limit = req.query.limit || 5;   // Default limit is 5 scores

    if (!accessToken) {
        return res.status(401).send('Access token required for this API call.');
    }

    try {
        // Make the request to the official osu! API v2 for best scores
        const osuApiResponse = await fetch(`${OSU_API_BASE}/users/${userId}/scores/best?mode=${mode}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`, // Use the access token
                'Content-Type': 'application/json'
            }
        });

        if (!osuApiResponse.ok) {
            const errorData = await osuApiResponse.json();
            console.error('osu! API error (best scores):', osuApiResponse.status, errorData);
            // Forward the error status and message from osu! API to the frontend
            return res.status(osuApiResponse.status).json(errorData);
        }

        const scoresData = await osuApiResponse.json();
        res.json(scoresData); // Send the data received from osu! API back to the frontend

    } catch (error) {
        console.error('Error proxying osu! best scores request:', error);
        res.status(500).send('Internal server error.');
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
    // Log the public URL of the Replit backend for easy access
    console.log(`Your Replit Backend URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
});
