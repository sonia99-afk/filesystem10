const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Email и пароль обязательны.",
      });
    }

    email = email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        ok: false,
        error: "Некорректный email.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "Пароль должен содержать минимум 8 символов.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
        INSERT INTO users (
          email,
          password_hash
        )
        VALUES ($1, $2)
        RETURNING
          id,
          email,
          email_verified_at,
          created_at
      `,
      [email, passwordHash]
    );

    return res.status(201).json({
      ok: true,
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        ok: false,
        error: "Пользователь с таким email уже существует.",
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      ok: false,
      error: "Не удалось создать пользователя.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        error: "Email и пароль обязательны.",
      });
    }

    email = email.trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT
          id,
          email,
          password_hash,
          email_verified_at,
          created_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Неверный email или пароль.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        ok: false,
        error: "Неверный email или пароль.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return res.json({
      ok: true,

      token,

      user: {
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.email_verified_at,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      ok: false,
      error: "Не удалось выполнить вход.",
    });
  }
});

module.exports = router;