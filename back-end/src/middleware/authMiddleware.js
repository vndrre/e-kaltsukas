const { supabase } = require("../services/supabaseClient");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    return next();
  } catch (err) {
    return res.status(500).json({ message: "Authentication check failed" });
  }
};

module.exports = { authMiddleware };
