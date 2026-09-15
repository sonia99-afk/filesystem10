const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();


router.post("/", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    let { name } = req.body;

    if (typeof name !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Название воркспейса обязательно.",
      });
    }

    name = name.trim();

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Название воркспейса не может быть пустым.",
      });
    }

    if (name.length > 150) {
      return res.status(400).json({
        ok: false,
        error: "Название воркспейса слишком длинное.",
      });
    }

    await client.query("BEGIN");

    const workspaceResult = await client.query(
      `
        INSERT INTO workspaces (
          name,
          owner_id
        )
        VALUES ($1, $2)
        RETURNING
          id,
          name,
          owner_id,
          created_at,
          updated_at
      `,
      [
        name,
        req.user.id,
      ]
    );

    const workspace = workspaceResult.rows[0];

    await client.query(
      `
        INSERT INTO workspace_members (
          workspace_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'owner')
      `,
      [
        workspace.id,
        req.user.id,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.owner_id,
        role: "owner",
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create workspace error:", error);

    return res.status(500).json({
      ok: false,
      error: "Не удалось создать воркспейс.",
    });
  } finally {
    client.release();
  }
});


router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          w.id,
          w.name,
          w.owner_id,
          wm.role,
          w.created_at,
          w.updated_at
        FROM workspace_members wm
        JOIN workspaces w
          ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.updated_at DESC
      `,
      [req.user.id]
    );

    const workspaces = result.rows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.owner_id,
      role: workspace.role,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    }));

    return res.json({
      ok: true,
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      ok: false,
      error: "Не удалось получить воркспейсы.",
    });
  }
});

router.post(
  "/:workspaceId/members",
  requireAuth,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;

      let { email, role } = req.body;

      if (typeof email !== "string") {
        return res.status(400).json({
          ok: false,
          error: "Email обязателен.",
        });
      }

      email = email.trim().toLowerCase();

      if (!email || !email.includes("@")) {
        return res.status(400).json({
          ok: false,
          error: "Некорректный email.",
        });
      }

      role = role || "editor";

      if (!["editor", "viewer"].includes(role)) {
        return res.status(400).json({
          ok: false,
          error: "Допустимые роли: editor или viewer.",
        });
      }

      const workspaceResult = await pool.query(
        `
          SELECT
            id,
            owner_id
          FROM workspaces
          WHERE id = $1
          LIMIT 1
        `,
        [workspaceId]
      );

      const workspace = workspaceResult.rows[0];

      if (!workspace) {
        return res.status(404).json({
          ok: false,
          error: "Воркспейс не найден.",
        });
      }

      if (workspace.owner_id !== req.user.id) {
        return res.status(403).json({
          ok: false,
          error: "Добавлять участников может только владелец воркспейса.",
        });
      }

      const userResult = await pool.query(
        `
          SELECT
            id,
            email
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );

      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "Пользователь с таким email не зарегистрирован.",
        });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          ok: false,
          error: "Владелец уже состоит в этом воркспейсе.",
        });
      }

      const memberResult = await pool.query(
        `
          INSERT INTO workspace_members (
            workspace_id,
            user_id,
            role
          )
          VALUES ($1, $2, $3)
          RETURNING
            workspace_id,
            user_id,
            role,
            created_at
        `,
        [
          workspaceId,
          user.id,
          role,
        ]
      );

      return res.status(201).json({
        ok: true,

        member: {
          workspaceId:
            memberResult.rows[0].workspace_id,

          userId:
            memberResult.rows[0].user_id,

          email: user.email,

          role:
            memberResult.rows[0].role,

          createdAt:
            memberResult.rows[0].created_at,
        },
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          ok: false,
          error: "Пользователь уже добавлен в этот воркспейс.",
        });
      }

      console.error(
        "Add workspace member error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "Не удалось добавить участника.",
      });
    }
  }
);

router.get(
  "/:workspaceId/members",
  requireAuth,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;

      const accessResult = await pool.query(
        `
          SELECT role
          FROM workspace_members
          WHERE
            workspace_id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [
          workspaceId,
          req.user.id,
        ]
      );

      if (!accessResult.rows[0]) {
        return res.status(403).json({
          ok: false,
          error: "Нет доступа к этому воркспейсу.",
        });
      }

      const result = await pool.query(
        `
          SELECT
            u.id,
            u.email,
            wm.role,
            wm.created_at
          FROM workspace_members wm
          JOIN users u
            ON u.id = wm.user_id
          WHERE wm.workspace_id = $1
          ORDER BY wm.created_at ASC
        `,
        [workspaceId]
      );

      return res.json({
        ok: true,

        members: result.rows.map(
          (member) => ({
            id: member.id,
            email: member.email,
            role: member.role,
            createdAt: member.created_at,
          })
        ),
      });
    } catch (error) {
      console.error(
        "Get workspace members error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "Не удалось получить участников.",
      });
    }
  }
);


module.exports = router;