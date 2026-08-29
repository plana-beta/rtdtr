import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'plana-secret-dev-key-123';

// Helper to encode Strava tokens in HttpOnly cookie
const setAuthCookie = (res: express.Response, tokens: any) => {
  const token = jwt.sign(tokens, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('plana_strava', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const getTokens = (req: express.Request) => {
  const token = req.cookies.plana_strava;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/strava/auth', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || `http://localhost:3000/api/strava/callback`;
  if (!clientId) {
    return res.status(500).send('Strava Client ID not configured.');
  }
  const scope = 'read,activity:read_all';
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scope}`;
  res.redirect(stravaAuthUrl);
});

app.get('/api/strava/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect('/profile?strava_error=' + encodeURIComponent(String(error)));
  }
  if (!code) {
    return res.redirect('/profile?strava_error=no_code');
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_at,
      athlete: response.data.athlete
    };

    setAuthCookie(res, tokens);
    res.redirect('/profile?strava_success=true');
  } catch (err: any) {
    console.error('Strava token error:', err.response?.data || err.message);
    res.redirect('/profile?strava_error=token_exchange_failed');
  }
});

app.get('/api/strava/status', (req, res) => {
  const tokens = getTokens(req);
  if (tokens) {
    res.json({ connected: true, athlete: tokens.athlete });
  } else {
    res.json({ connected: false });
  }
});

app.post('/api/strava/disconnect', (req, res) => {
  res.clearCookie('plana_strava');
  res.json({ success: true });
});

// Refresh token helper
const refreshStravaToken = async (req: express.Request, res: express.Response, tokens: any) => {
  if (Date.now() / 1000 < tokens.expiresAt) {
    return tokens.accessToken;
  }
  
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    });
    const newTokens = {
      ...tokens,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_at
    };
    setAuthCookie(res, newTokens);
    return newTokens.accessToken;
  } catch (err) {
    console.error('Failed to refresh token');
    return null;
  }
};

app.get('/api/strava/activities', async (req, res) => {
  const tokens = getTokens(req);
  if (!tokens) {
    return res.status(401).json({ error: 'Not connected' });
  }

  const accessToken = await refreshStravaToken(req, res, tokens);
  if (!accessToken) {
    res.clearCookie('plana_strava');
    return res.status(401).json({ error: 'Session expired' });
  }

  const { after } = req.query; // unix timestamp
  
  try {
    let url = 'https://www.strava.com/api/v3/athlete/activities?per_page=100';
    if (after) {
      url += `&after=${after}`;
    }

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const activities = response.data;
    
    // Map to ExternalWorkout format
    const externalWorkouts = activities.map((a: any) => {
      // Strava sport types: Ride, Run, Swim, Workout, WeightTraining, etc.
      let sport = 'Other';
      if (a.type === 'Ride' || a.type === 'VirtualRide') sport = 'Ride';
      else if (a.type === 'Run' || a.type === 'VirtualRun') sport = 'Run';
      else if (a.type === 'Swim') sport = 'Swim';
      else if (a.type === 'WeightTraining' || a.type === 'Workout') sport = 'Strength';

      return {
        id: `strava-${a.id}`,
        source: 'strava',
        sourceId: String(a.id),
        sport: sport,
        startTime: a.start_date_local || a.start_date, // Prefer local time
        duration: a.moving_time, // seconds
        distance: a.distance, // meters
        averageHeartRate: a.has_heartrate ? a.average_heartrate : undefined,
        maxHeartRate: a.has_heartrate ? a.max_heartrate : undefined,
        averagePower: a.device_watts ? a.average_watts : undefined,
        normalizedPower: a.device_watts ? a.normalized_watts || a.weighted_average_watts : undefined,
        title: a.name,
      };
    });

    res.json(externalWorkouts);
  } catch (err: any) {
    console.error('Failed to fetch Strava activities:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});


async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
