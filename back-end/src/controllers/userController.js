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

const updateMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { username, bio, location, instagram } = req.body || {};

    const payload = {
      id: userId,
      username: username?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      instagram: instagram?.trim() || null
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("id, username, bio, location, instagram, created_at")
      .single();

    if (error) {
      console.error("updateMe error", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }

    return res.json({ user: data });
  } catch (err) {
    console.error("updateMe error", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

module.exports = {
  getMe,
  updateMe
};
