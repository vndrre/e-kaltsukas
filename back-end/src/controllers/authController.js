const login = async (req, res) => {
  return res.status(501).json({
    message: "Not implemented yet",
    endpoint: "POST /api/auth/login"
  });
};

const signup = async (req, res) => {
  return res.status(501).json({
    message: "Not implemented yet",
    endpoint: "POST /api/auth/signup"
  });
};

module.exports = {
  login,
  signup
};
