const listItems = async (req, res) => {
  return res.status(501).json({
    message: "Not implemented yet",
    endpoint: "GET /api/items"
  });
};

const createItem = async (req, res) => {
  return res.status(501).json({
    message: "Not implemented yet",
    endpoint: "POST /api/items"
  });
};

module.exports = {
  listItems,
  createItem
};
