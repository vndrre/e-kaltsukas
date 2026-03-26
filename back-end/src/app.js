const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { env } = require("./config/env");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",")
  })
);
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Image exceeds 8MB limit" });
    }

    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
