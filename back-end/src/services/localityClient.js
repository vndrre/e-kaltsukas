const { env } = require("../config/env");

const DEFAULT_BASE_URL = "https://api.locality.ee";

const getBaseUrl = () => (env.LOCALITY_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

const mapAddressResult = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const line1 =
    item.address ||
    item.text ||
    item.street ||
    item.full ||
    item.label ||
    item.name ||
    "";
  const city = item.locality || item.city || item.municipality || item.county || "";
  const postalCode = item.postal || item.postalCode || item.zip || item.postal_index || item.postalIndex || "";
  const label =
    item.label ||
    item.display ||
    [line1, postalCode, city].filter((value) => typeof value === "string" && value.trim()).join(", ");

  if (!label && !line1) {
    return null;
  }

  return {
    label: label || line1,
    line1: line1 || label,
    city,
    postalCode,
    country: "Estonia"
  };
};

const searchAddresses = async ({ text, locality }) => {
  const apiKey = env.LOCALITY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const query = typeof text === "string" ? text.trim() : "";
  if (query.length < 3) {
    return [];
  }

  const payload = {
    apiKey,
    text: query
  };

  if (typeof locality === "string" && locality.trim()) {
    payload.locality = locality.trim();
  }

  const response = await fetch(`${getBaseUrl()}/api/v1/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== "success") {
    const error = new Error(result?.reason || "Address search failed");
    error.statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }

  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows.map(mapAddressResult).filter(Boolean);
};

module.exports = {
  searchAddresses
};
