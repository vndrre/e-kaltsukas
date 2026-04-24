const { supabase, supabaseAdmin } = require("../services/supabaseClient");

const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const db = supabaseAdmin || supabase;
    const selectProfile = () =>
      db
        .from("profiles")
        .select("id, username, bio, location, instagram, created_at")
        .eq("id", userId)
        .maybeSingle();

    let { data, error } = await selectProfile();

    if (!data && !error) {
      const { error: insertError } = await db.from("profiles").upsert(
        {
          id: userId,
          email: req.user.email || null
        },
        { onConflict: "id" }
      );

      if (!insertError) {
        ({ data, error } = await selectProfile());
      } else {
        console.error("getMe profile create error", insertError);
      }
    }

    if (error) {
      console.error("getMe error", error);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!data) {
      return res.status(404).json({ message: "User profile not found" });
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
    const db = supabaseAdmin || supabase;

    const payload = {
      id: userId,
      email: req.user.email || null,
      username: username?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      instagram: instagram?.trim() || null
    };

    const { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("id, username, bio, location, instagram, created_at")
      .single();

    if (updateError) {
      console.error("updateMe error", updateError);
      return res.status(500).json({ message: "Failed to update profile" });
    }

    return res.json({ user: updatedProfile });
  } catch (err) {
    console.error("updateMe error", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

module.exports = {
  getMe,
  updateMe
};
