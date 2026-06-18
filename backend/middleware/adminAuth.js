function adminAuth(req, res, next) {
  const key = req.header("x-admin-key") || req.query.admin_key;
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: "Forbidden: invalid admin key" });
  }
  next();
}
module.exports = adminAuth;
