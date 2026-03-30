const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Middleware: só admins passam
async function adminOnly(req, res, next) {
  const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId]);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// GET /api/admin/users — lista todos os usuários
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await db.all(
      `SELECT id, username, handle, email, bio, avatar_url, is_admin, banned, ban_reason, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/admin/posts/:id — excluir qualquer post
router.delete('/posts/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const post = await db.get('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/admin/users/:id/ban — banir usuário com motivo
router.post('/users/:id/ban', authMiddleware, adminOnly, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.userId) return res.status(400).json({ error: 'Não pode banir a si mesmo' });
  const { reason } = req.body;
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'Informe o motivo do banimento' });
  try {
    const user = await db.get('SELECT id, is_admin FROM users WHERE id = ?', [targetId]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.is_admin) return res.status(400).json({ error: 'Não é possível banir um administrador' });
    await db.run('UPDATE users SET banned = 1, ban_reason = ? WHERE id = ?', [reason.trim(), targetId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/admin/users/:id/unban — desbanir usuário
router.post('/users/:id/unban', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.run('UPDATE users SET banned = 0, ban_reason = NULL WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;