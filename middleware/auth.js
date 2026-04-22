function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  if (req.accepts('html')) return res.redirect('/login');
  return res.status(401).json({ error: 'unauthorized' });
}

module.exports = { requireAuth };
