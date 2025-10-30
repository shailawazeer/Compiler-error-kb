const db = require("../db");
const axios = require("axios");

// Get the pool from db module
const pool = db; // or db.pool if your db.js exports { pool }

/**
 * Helper: normalize query text for consistent DB lookup
 */
function normalizeQuery(q) {
  if (!q || typeof q !== "string") return "";
  // Basic normalization: trim + lower + collapse whitespace
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Call Gemini generateContent REST endpoint.
 * We build the endpoint from model + key (query param).
 */
async function callGemini(queryText) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured in environment variables");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
  const override = process.env.GEMINI_ENDPOINT_OVERRIDE || "";

  // Prefer explicit override if provided (e.g., regional endpoint)
  const baseUrl = override
    ? override.replace(/\/$/, "")
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const urlWithKey = `${baseUrl}?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a helpful assistant specialized in compiler errors and debugging.

User error query:
"""
${queryText}
"""

Provide:
1) A clear, step-by-step explanation of the likely cause(s).
2) Practical fixes or commands the user can run.
3) Example corrected code if relevant (short).
4) A short "TL;DR" summary line at the top.

Return the answer as plain text, well-formatted for readability.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
    },
  };

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    const resp = await axios.post(urlWithKey, payload, {
      headers,
      timeout: 30000, // 30 seconds
    });

    // Parse the response robustly
    const data = resp.data || {};

    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      const candidate = data.candidates[0];

      if (candidate.content && candidate.content.parts) {
        const text = candidate.content.parts
          .map((p) => p.text || "")
          .join("\n")
          .trim();

        if (text) return text;
      }
    }

    // Fallback
    return "No solution generated. Please try rephrasing your error.";
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);

    const msg = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;

    throw new Error(`Gemini API call failed: ${msg}`);
  }
}

/**
 * POST /api/errors
 * Body: { query: "compiler error text", programming_language?: "cpp" }
 * - If exists in DB, return that.
 * - If not, call Gemini, save result, and return saved record.
 */
async function createOrGetSolution(req, res) {
  const rawQuery = req.body?.query ? String(req.body.query) : "";
  const language = req.body?.programming_language || "auto";

  if (!rawQuery || rawQuery.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Query is required in request body as { query: "..." }',
    });
  }

  const normalized = normalizeQuery(rawQuery);

  let conn;
  try {
    conn = await pool.getConnection();

    // 1) Look up in DB (exact normalized match)
    const [rows] = await conn.query(
      `SELECT id, error_text, normalized_query, solution_text, programming_language, created_at 
       FROM errors 
       WHERE normalized_query = ? 
       LIMIT 1`,
      [normalized]
    );

    if (rows.length > 0) {
      // Found in history — return
      return res.json({
        success: true,
        source: "database",
        data: rows[0],
      });
    }

    // 2) Not found — call Gemini
    console.log(
      `🔍 Calling Gemini for query: "${rawQuery.substring(0, 50)}..."`
    );
    const solutionText = await callGemini(rawQuery);

    // 3) Insert into DB
    const insertSql = `
      INSERT INTO errors (error_text, normalized_query, solution_text, programming_language) 
      VALUES (?, ?, ?, ?)
    `;

    const [insertResult] = await conn.query(insertSql, [
      rawQuery,
      normalized,
      solutionText,
      language,
    ]);

    // 4) Fetch the newly inserted row
    const [newRows] = await conn.query(
      `SELECT id, error_text, normalized_query, solution_text, programming_language, created_at 
       FROM errors 
       WHERE id = ?`,
      [insertResult.insertId]
    );

    console.log(`✅ Saved to database with ID: ${insertResult.insertId}`);

    return res.json({
      success: true,
      source: "gemini",
      data: newRows[0],
    });
  } catch (err) {
    console.error("❌ createOrGetSolution error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * GET /api/errors (history list)
 * Optional query params: limit, offset
 */
async function listHistory(req, res) {
  const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 500);
  const offset = parseInt(req.query.offset || "0", 10) || 0;

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      `SELECT 
        id, 
        error_text, 
        normalized_query, 
        LEFT(solution_text, 200) AS solution_preview, 
        programming_language,
        created_at 
       FROM errors 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error("❌ listHistory error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * GET /api/errors/:id
 */
async function getById(req, res) {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
    });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(
      `SELECT 
        id, 
        error_text, 
        normalized_query, 
        solution_text, 
        programming_language,
        created_at 
       FROM errors 
       WHERE id = ? 
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("❌ getById error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * DELETE /api/errors/:id
 */
async function deleteError(req, res) {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
    });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const [result] = await conn.query("DELETE FROM errors WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Error not found",
      });
    }

    return res.json({
      success: true,
      message: "Error deleted successfully",
    });
  } catch (err) {
    console.error("❌ deleteError error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  createOrGetSolution,
  listHistory,
  getById,
  deleteError,
};
