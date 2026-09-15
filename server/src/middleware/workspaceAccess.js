const pool = require("../db");

function requireWorkspaceRole(...allowedRoles) {
  return async function workspaceAccess(req, res, next) {
    try {
      const { workspaceId } = req.params;

      if (!workspaceId) {
        return res.status(400).json({
          ok: false,
          error: "Не указан воркспейс.",
        });
      }

      const result = await pool.query(
        `
          SELECT
            workspace_id,
            user_id,
            role
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

      const membership = result.rows[0];

      if (!membership) {
        return res.status(403).json({
          ok: false,
          error: "Нет доступа к этому воркспейсу.",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          ok: false,
          error: "Недостаточно прав для выполнения операции.",
        });
      }

      req.workspaceMembership = {
        workspaceId: membership.workspace_id,
        userId: membership.user_id,
        role: membership.role,
      };

      next();
    } catch (error) {
      console.error(
        "Workspace access error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "Не удалось проверить доступ к воркспейсу.",
      });
    }
  };
}

module.exports = requireWorkspaceRole;