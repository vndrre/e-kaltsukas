const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const { env } = require("../config/env");

const profileSelectFields = "id, username, bio, location, instagram, avatar_url, created_at";

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
        .select(profileSelectFields)
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

    const { username, bio, location, instagram, avatarUrl } = req.body || {};
    const db = supabaseAdmin || supabase;

    const payload = {
      id: userId,
      email: req.user.email || null,
      username: username?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      instagram: instagram?.trim() || null,
      avatar_url: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null
    };

    const { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select(profileSelectFields)
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

const uploadMyAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!env.CLOUDINARY_URL) {
      return res
        .status(500)
        .json({ message: "CLOUDINARY_URL is missing in server config" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "avatar file is required" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image uploads are allowed" });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "marketplace/avatars",
      public_id: `avatar-${userId}-${Date.now()}`
    });

    const db = supabaseAdmin || supabase;
    const { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: req.user.email || null,
          avatar_url: uploadResult.secure_url
        },
        { onConflict: "id" }
      )
      .select(profileSelectFields)
      .single();

    if (updateError) {
      console.error("uploadMyAvatar profile update error", updateError);
      const isMissingAvatarColumn =
        updateError.code === "42703" || /avatar_url/i.test(updateError.message || "");
      return res.status(500).json({
        message: isMissingAvatarColumn
          ? "Database column profiles.avatar_url is missing. Run back-end/supabase/auth-profile-setup.sql in Supabase."
          : updateError.message || "Failed to persist avatar URL"
      });
    }

    return res.status(201).json({
      avatar: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      },
      user: updatedProfile
    });
  } catch (err) {
    console.error("uploadMyAvatar error", err);
    return res.status(500).json({ message: err?.message || "Failed to upload avatar" });
  }
};

module.exports = {
  getMe,
  updateMe,
  uploadMyAvatar
};
