// api/auth/google.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, redirect_uri } = req.body;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return res.status(400).json({ error: tokens.error });
  }

  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const user = await userInfo.json();

  res.status(200).json({
    email: user.email,
    name: user.name,
    given_name: user.given_name,
    family_name: user.family_name,
    picture: user.picture,
    id_token: tokens.id_token,
  });
}