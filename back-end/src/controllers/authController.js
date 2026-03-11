const { supabase } = require("../services/supabaseClient");

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      const status = error.status || 400;
      return res.status(status).json({ message: error.message });
    }

    // For email/password, Supabase returns a session only in some flows.
    // We return the user; client can handle confirmation flows.
    return res.status(201).json({ user: data.user, session: data.session });
  } catch (err) {
    console.error("Signup error", err);
    return res.status(500).json({ message: "Failed to sign up" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Return access_token for use in Authorization: Bearer <token>
    return res.json({
      user,
      token: session.access_token,
      session
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "Failed to log in" });
  }
};

module.exports = {
  login,
  signup
};
