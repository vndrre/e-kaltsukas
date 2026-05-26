const { env } = require("../config/env");
const { searchAddresses } = require("../services/localityClient");

const searchAddressSuggestions = async (req, res) => {
  try {
    const text = typeof req.query?.text === "string" ? req.query.text : req.query?.q;
    const locality = typeof req.query?.locality === "string" ? req.query.locality : undefined;

    if (!env.LOCALITY_API_KEY) {
      return res.json({ results: [], available: false });
    }

    const results = await searchAddresses({ text, locality });

    return res.json({ results, available: true });
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({
      message: err?.message || "Address search failed"
    });
  }
};

module.exports = {
  searchAddressSuggestions
};
