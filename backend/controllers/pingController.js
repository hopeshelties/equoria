exports.handlePing = (req, res) => {
  const { name } = req.query;
  const message = name ? `pong, ${name}!` : 'pong';
  res.json({ message });
}; 