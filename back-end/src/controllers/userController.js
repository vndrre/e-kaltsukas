const { supabase } = require("../services/supabaseClient");

const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, bio, location, instagram, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("getMe error", error);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: data });
  } catch (err) {
    console.error("getMe error", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
};

module.exports = {
  getMe
};
