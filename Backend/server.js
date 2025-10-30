require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const errorRoutes = require("./routes/errorRoutes");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/api/errors", errorRoutes);

// health
app.get("/", (req, res) =>
  res.send({ status: "ok", app: "compiler-error-kb-backend" })
);

// Test database connection
app.get("/test-db", async (req, res) => {
  try {
    const db = require("./db");
    await db.query("SELECT 1");
    res.json({ status: "Database connection successful" });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
