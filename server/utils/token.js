function jwtExpiresInSeconds() {
  const raw = String(process.env.JWT_EXPIRES || '7d').trim();
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60;

  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[match[2].toLowerCase()];
}

module.exports = { jwtExpiresInSeconds };
