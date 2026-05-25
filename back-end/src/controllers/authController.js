const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const { env } = require("../config/env");

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const normalizeName = (name) =>
  typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";

const buildAuthPayload = ({ user, session }, extra = {}) => ({
  user,
  token: session?.access_token || null,
  refreshToken: session?.refresh_token || null,
  expiresAt: session?.expires_at || null,
  session,
  ...extra
});

const getFriendlyAuthMessage = (error) => {
  const message = error?.message || "";

  if (error?.status === 429 || /rate limit/i.test(message)) {
    return "Too many signup emails were requested. Please wait a few minutes and try again.";
  }

  return message || "Authentication failed";
};

const upsertProfileForUser = async (user) => {
  if (!user?.id) {
    return;
  }

  const client = supabaseAdmin || supabase;
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      email: user.email || null
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Profile sync after signup failed", error);
  }
};

const signup = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body?.email);
    const name = normalizeName(req.body?.name);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const options = {
      emailRedirectTo: env.AUTH_EMAIL_REDIRECT_URL
    };

    if (name) {
      options.data = { name };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    });

    if (error) {
      const status = error.status || 400;
      return res.status(status).json({ message: getFriendlyAuthMessage(error) });
    }

    await upsertProfileForUser(data.user);

    return res.status(201).json(
      buildAuthPayload(data, {
        needsEmailConfirmation: Boolean(data.user && !data.session)
      })
    );
  } catch (err) {
    console.error("Signup error", err);
    return res.status(500).json({ message: "Failed to sign up" });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { user, session } = data;

    return res.json(buildAuthPayload({ user, session }));
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "Failed to log in" });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    return res.json(buildAuthPayload(data));
  } catch (err) {
    console.error("Refresh session error", err);
    return res.status(500).json({ message: "Failed to refresh session" });
  }
};

module.exports = {
  login,
  refresh,
  signup
};
