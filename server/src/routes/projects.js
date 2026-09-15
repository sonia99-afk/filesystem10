const express = require("express");
const crypto = require("crypto");

const pool = require("../db");
const requireAuth = require("../middleware/auth");
const requireWorkspaceRole = require(
  "../middleware/workspaceAccess"
);

const router = express.Router();


/* =========================================================
   Получить список проектов воркспейса
========================================================= */

router.get(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceRole(
    "owner",
    "editor",
    "viewer"
  ),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;

      const result = await pool.query(
        `
          SELECT
            id,
            title,
            schema_version,
            revision,
            created_at,
            updated_at
          FROM projects
          WHERE workspace_id = $1
          ORDER BY updated_at DESC
        `,
        [workspaceId]
      );

      return res.json({
        ok: true,

        projects: result.rows.map(
          (project) => ({
            id: project.id,
            title: project.title,
            schemaVersion:
              project.schema_version,
            revision:
              project.revision,
            createdAt:
              project.created_at,
            updatedAt:
              project.updated_at,
          })
        ),
      });
    } catch (error) {
      console.error(
        "Get projects error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Не удалось получить проекты.",
      });
    }
  }
);


/* =========================================================
   Получить один проект
========================================================= */

router.get(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceRole(
    "owner",
    "editor",
    "viewer"
  ),
  async (req, res) => {
    try {
      const {
        workspaceId,
        projectId,
      } = req.params;

      const result = await pool.query(
        `
          SELECT
            id,
            workspace_id,
            title,
            schema_version,
            document,
            revision,
            created_at,
            updated_at
          FROM projects
          WHERE
            id = $1
            AND workspace_id = $2
          LIMIT 1
        `,
        [
          projectId,
          workspaceId,
        ]
      );

      const project = result.rows[0];

      if (!project) {
        return res.status(404).json({
          ok: false,
          error: "Проект не найден.",
        });
      }

      return res.json({
        ok: true,

        project: {
          id: project.id,
          workspaceId:
            project.workspace_id,
          title: project.title,
          schemaVersion:
            project.schema_version,
          document:
            project.document,
          revision:
            project.revision,
          createdAt:
            project.created_at,
          updatedAt:
            project.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "Get project error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Не удалось получить проект.",
      });
    }
  }
);


/* =========================================================
   Создать проект
========================================================= */

router.post(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceRole(
    "owner",
    "editor"
  ),
  async (req, res) => {
    try {
      const { workspaceId } =
        req.params;

      let {
        id,
        title,
        schemaVersion,
        document,
      } = req.body;

      title =
        typeof title === "string"
          ? title.trim()
          : "";

      if (!title) {
        title = "Проект";
      }

      if (title.length > 250) {
        return res.status(400).json({
          ok: false,
          error:
            "Название проекта слишком длинное.",
        });
      }

      if (
        !document ||
        typeof document !== "object" ||
        Array.isArray(document)
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Некорректные данные проекта.",
        });
      }

      schemaVersion =
        Number(schemaVersion) || 2;

      if (
        !Number.isInteger(
          schemaVersion
        ) ||
        schemaVersion < 1
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Некорректная версия проекта.",
        });
      }

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        id =
          "project_" +
          crypto.randomUUID();
      }

      id = id.trim();

      const result =
        await pool.query(
          `
            INSERT INTO projects (
              id,
              workspace_id,
              title,
              schema_version,
              document
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5
            )
            RETURNING
              id,
              workspace_id,
              title,
              schema_version,
              document,
              revision,
              created_at,
              updated_at
          `,
          [
            id,
            workspaceId,
            title,
            schemaVersion,
            document,
          ]
        );

      const project =
        result.rows[0];

      return res
        .status(201)
        .json({
          ok: true,

          project: {
            id: project.id,
            workspaceId:
              project.workspace_id,
            title:
              project.title,
            schemaVersion:
              project.schema_version,
            document:
              project.document,
            revision:
              project.revision,
            createdAt:
              project.created_at,
            updatedAt:
              project.updated_at,
          },
        });
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({
            ok: false,
            error:
              "Проект с таким ID уже существует.",
          });
      }

      console.error(
        "Create project error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Не удалось создать проект.",
      });
    }
  }
);


/* =========================================================
   Сохранить изменения проекта
========================================================= */

router.put(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceRole(
    "owner",
    "editor"
  ),
  async (req, res) => {
    try {
      const {
        workspaceId,
        projectId,
      } = req.params;

      let {
        title,
        schemaVersion,
        document,
        revision,
      } = req.body;

      if (
        !document ||
        typeof document !== "object" ||
        Array.isArray(document)
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Некорректные данные проекта.",
        });
      }

      revision = Number(revision);

      if (
        !Number.isInteger(revision) ||
        revision < 1
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Для сохранения требуется текущая revision.",
        });
      }

      title =
        typeof title === "string"
          ? title.trim()
          : "Проект";

      if (!title) {
        title = "Проект";
      }

      schemaVersion =
        Number(schemaVersion) || 2;

      const result =
        await pool.query(
          `
            UPDATE projects
            SET
              title = $1,
              schema_version = $2,
              document = $3,
              revision = revision + 1,
              updated_at = NOW()
            WHERE
              id = $4
              AND workspace_id = $5
              AND revision = $6
            RETURNING
              id,
              workspace_id,
              title,
              schema_version,
              document,
              revision,
              created_at,
              updated_at
          `,
          [
            title,
            schemaVersion,
            document,
            projectId,
            workspaceId,
            revision,
          ]
        );

      const project =
        result.rows[0];

      if (!project) {
        const currentResult =
          await pool.query(
            `
              SELECT revision
              FROM projects
              WHERE
                id = $1
                AND workspace_id = $2
              LIMIT 1
            `,
            [
              projectId,
              workspaceId,
            ]
          );

        const current =
          currentResult.rows[0];

        if (!current) {
          return res
            .status(404)
            .json({
              ok: false,
              error:
                "Проект не найден.",
            });
        }

        return res
          .status(409)
          .json({
            ok: false,
            error:
              "Проект уже был изменён. Необходимо загрузить свежую версию.",
            currentRevision:
              current.revision,
          });
      }

      return res.json({
        ok: true,

        project: {
          id: project.id,
          workspaceId:
            project.workspace_id,
          title:
            project.title,
          schemaVersion:
            project.schema_version,
          document:
            project.document,
          revision:
            project.revision,
          createdAt:
            project.created_at,
          updatedAt:
            project.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "Update project error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Не удалось сохранить проект.",
      });
    }
  }
);


/* =========================================================
   Удалить проект
========================================================= */

router.delete(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceRole(
    "owner",
    "editor"
  ),
  async (req, res) => {
    try {
      const {
        workspaceId,
        projectId,
      } = req.params;

      const result =
        await pool.query(
          `
            DELETE FROM projects
            WHERE
              id = $1
              AND workspace_id = $2
            RETURNING id
          `,
          [
            projectId,
            workspaceId,
          ]
        );

      if (!result.rows[0]) {
        return res
          .status(404)
          .json({
            ok: false,
            error:
              "Проект не найден.",
          });
      }

      return res.json({
        ok: true,
        deletedProjectId:
          result.rows[0].id,
      });
    } catch (error) {
      console.error(
        "Delete project error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Не удалось удалить проект.",
      });
    }
  }
);


module.exports = router;