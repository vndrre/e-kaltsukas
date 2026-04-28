const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const { env } = require("../config/env");

const profileSelectFields =
  "id, username, bio, location, instagram, avatar_url, closet_name, closet_description, style_tags, created_at";

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

    const [
      { count: followersCount, error: followersCountError },
      { count: followingCount, error: followingCountError }
    ] = await Promise.all([
      db.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      db.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId)
    ]);

    if (followersCountError || followingCountError) {
      return res.status(500).json({
        message:
          followersCountError?.message ||
          followingCountError?.message ||
          "Failed to load follow counts"
      });
    }

    return res.json({
      user: {
        ...data,
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0
      }
    });
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

    const { username, bio, location, instagram, avatarUrl, closetName, closetDescription, styleTags } = req.body || {};
    const db = supabaseAdmin || supabase;

    const payload = {
      id: userId,
      email: req.user.email || null,
      username: username?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      instagram: instagram?.trim() || null,
      closet_name: closetName?.trim() || null,
      closet_description: closetDescription?.trim() || null
    };

    if (Array.isArray(styleTags)) {
      payload.style_tags = styleTags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean)
        .slice(0, 8);
    }

    // Do not clear avatar_url on normal profile edits.
    // Only update avatar_url when the client explicitly sends avatarUrl.
    if (typeof avatarUrl === "string") {
      payload.avatar_url = avatarUrl.trim() || null;
    }

    let { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select(profileSelectFields)
      .maybeSingle();

    if (!updateError && !updatedProfile) {
      ({ data: updatedProfile, error: updateError } = await db
        .from("profiles")
        .insert(payload)
        .select(profileSelectFields)
        .single());
    }

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
    const avatarPayload = {
      id: userId,
      email: req.user.email || null,
      avatar_url: uploadResult.secure_url
    };

    let { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .update(avatarPayload)
      .eq("id", userId)
      .select(profileSelectFields)
      .maybeSingle();

    if (!updateError && !updatedProfile) {
      ({ data: updatedProfile, error: updateError } = await db
        .from("profiles")
        .insert(avatarPayload)
        .select(profileSelectFields)
        .single());
    }

    if (updateError) {
      console.error("uploadMyAvatar profile update error", updateError);
      const isMissingAvatarColumn =
        updateError.code === "42703" || /avatar_url/i.test(updateError.message || "");
      const isRlsError = /row-level security/i.test(updateError.message || "");
      return res.status(500).json({
        message: isMissingAvatarColumn
          ? "Database column profiles.avatar_url is missing. Run back-end/supabase/auth-profile-setup.sql in Supabase."
          : isRlsError
            ? "Supabase RLS blocked profile update. Add SUPABASE_SERVICE_ROLE_KEY in back-end/.env or add RLS policies allowing users to update their own profile row."
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

const getPublicProfile = async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const profileId = req.params?.id;
    const db = supabaseAdmin || supabase;

    if (!viewerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!profileId) {
      return res.status(400).json({ message: "Profile id is required" });
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select(profileSelectFields)
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ message: profileError.message || "Failed to load profile" });
    }

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const { data: listings, error: listingsError } = await db
      .from("items")
      .select(
        "id, title, price_cents, condition, size, brand, category, images_json, seller_id, created_at"
      )
      .eq("seller_id", profileId)
      .order("created_at", { ascending: false });

    if (listingsError) {
      return res.status(500).json({ message: listingsError.message || "Failed to load listings" });
    }

    const [
      { count: followersCount, error: followersCountError },
      { count: followingCount, error: followingCountError },
      { data: followRow, error: followStatusError }
    ] = await Promise.all([
      db.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      db.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      db
        .from("user_follows")
        .select("follower_id, following_id")
        .eq("follower_id", viewerId)
        .eq("following_id", profileId)
        .maybeSingle()
    ]);

    if (followersCountError || followingCountError || followStatusError) {
      return res.status(500).json({
        message:
          followersCountError?.message ||
          followingCountError?.message ||
          followStatusError?.message ||
          "Failed to load follow data"
      });
    }

    const normalizedListings = (listings ?? []).map((entry) => {
      const rawImages = Array.isArray(entry.images_json)
        ? entry.images_json
        : typeof entry.images_json === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(entry.images_json);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [];

      return {
        id: entry.id,
        title: entry.title,
        condition: entry.condition,
        size: entry.size,
        brand: entry.brand,
        category: entry.category,
        seller_id: entry.seller_id,
        image: rawImages[0] || null,
        price: typeof entry.price_cents === "number" ? entry.price_cents / 100 : 0
      };
    });

    return res.json({
      profile: {
        ...profile,
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0
      },
      listings: normalizedListings,
      isFollowing: Boolean(followRow)
    });
  } catch (err) {
    console.error("getPublicProfile error", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
};

const followUser = async (req, res) => {
  try {
    const followerId = req.user?.id;
    const followingId = req.params?.id;
    const db = supabaseAdmin || supabase;

    if (!followerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!followingId) {
      return res.status(400).json({ message: "Profile id is required" });
    }

    if (followerId === followingId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const { error } = await db.from("user_follows").upsert(
      {
        follower_id: followerId,
        following_id: followingId
      },
      {
        onConflict: "follower_id,following_id",
        ignoreDuplicates: true
      }
    );

    if (error) {
      return res.status(500).json({ message: error.message || "Failed to follow user" });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("followUser error", err);
    return res.status(500).json({ message: "Failed to follow user" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user?.id;
    const followingId = req.params?.id;
    const db = supabaseAdmin || supabase;

    if (!followerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!followingId) {
      return res.status(400).json({ message: "Profile id is required" });
    }

    const { error } = await db
      .from("user_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) {
      return res.status(500).json({ message: error.message || "Failed to unfollow user" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("unfollowUser error", err);
    return res.status(500).json({ message: "Failed to unfollow user" });
  }
};

const listFollowers = async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const profileId = req.params?.id;
    const db = supabaseAdmin || supabase;

    if (!viewerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 50);
    const offset = Math.max(Number(req.query?.offset) || 0, 0);

    const { data: rows, error, count } = await db
      .from("user_follows")
      .select("follower_id", { count: "exact" })
      .eq("following_id", profileId)
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ message: error.message || "Failed to load followers" });
    }

    const followerIds = (rows ?? []).map((entry) => entry.follower_id);
    if (!followerIds.length) {
      return res.json({
        users: [],
        total: count ?? 0,
        hasMore: false,
        nextOffset: offset
      });
    }

    const { data: users, error: usersError } = await db
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", followerIds);

    if (usersError) {
      return res.status(500).json({ message: usersError.message || "Failed to load followers" });
    }

    const safeUsers = users ?? [];
    const { data: followingRows } = safeUsers.length
      ? await db
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .in("following_id", safeUsers.map((entry) => entry.id))
      : { data: [] };

    const followingSet = new Set((followingRows ?? []).map((entry) => entry.following_id));

    return res.json({
      users: safeUsers.map((entry) => ({
        ...entry,
        isFollowing: followingSet.has(entry.id)
      })),
      total: count ?? 0,
      hasMore: offset + (rows?.length || 0) < (count ?? 0),
      nextOffset: offset + (rows?.length || 0)
    });
  } catch (err) {
    console.error("listFollowers error", err);
    return res.status(500).json({ message: "Failed to load followers" });
  }
};

const listFollowing = async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const profileId = req.params?.id;
    const db = supabaseAdmin || supabase;

    if (!viewerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 50);
    const offset = Math.max(Number(req.query?.offset) || 0, 0);

    const { data: rows, error, count } = await db
      .from("user_follows")
      .select("following_id", { count: "exact" })
      .eq("follower_id", profileId)
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ message: error.message || "Failed to load following" });
    }

    const followingIds = (rows ?? []).map((entry) => entry.following_id);
    if (!followingIds.length) {
      return res.json({
        users: [],
        total: count ?? 0,
        hasMore: false,
        nextOffset: offset
      });
    }

    const { data: users, error: usersError } = await db
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", followingIds);

    if (usersError) {
      return res.status(500).json({ message: usersError.message || "Failed to load following" });
    }

    const safeUsers = users ?? [];
    const { data: viewerFollowingRows } = safeUsers.length
      ? await db
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .in("following_id", safeUsers.map((entry) => entry.id))
      : { data: [] };

    const viewerFollowingSet = new Set(
      (viewerFollowingRows ?? []).map((entry) => entry.following_id)
    );

    return res.json({
      users: safeUsers.map((entry) => ({
        ...entry,
        isFollowing: viewerFollowingSet.has(entry.id)
      })),
      total: count ?? 0,
      hasMore: offset + (rows?.length || 0) < (count ?? 0),
      nextOffset: offset + (rows?.length || 0)
    });
  } catch (err) {
    console.error("listFollowing error", err);
    return res.status(500).json({ message: "Failed to load following" });
  }
};

module.exports = {
  getMe,
  updateMe,
  uploadMyAvatar,
  getPublicProfile,
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing
};
