require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const workspaceRoutes = require("./routes/workspaces");
const authRoutes = require("./routes/auth");
const requireAuth = require("./middleware/auth");
const projectRoutes =
  require("./routes/projects");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use(
  "/api/workspaces",
  projectRoutes
);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS database_time"
    );

    res.json({
      ok: true,
      database: "connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      database: "disconnected",
    });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.user,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});