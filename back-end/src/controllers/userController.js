const getMe = async (req, res) => {
  return res.status(501).json({
    message: "Not implemented yet",
    endpoint: "GET /api/users/me"
  });
};

module.exports = {
  getMe
};
