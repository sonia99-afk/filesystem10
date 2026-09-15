const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      ok: false,
      error: "Требуется авторизация.",
    });
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: "Недействительный или истёкший токен.",
    });
  }
}

module.exports = requireAuth;