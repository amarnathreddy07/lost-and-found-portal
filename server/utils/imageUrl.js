function driveFolderId(value) {
  const text = String(value || '').trim();
  const match = text.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|folderview\?id=|open\?[^#\s]*id=)([\w-]{10,})/i);
  return match ? match[1] : '';
}

function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const folderId = driveFolderId(text);
  if (folderId) return `https://drive.google.com/drive/folders/${folderId}`;
  if (/^https?:\/\/(?:drive|docs)\.google\.com\/thumbnail\?/i.test(text)) return text;
  const match = text.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|file\/u\/\d+\/d\/|open\?[^#\s]*id=|uc\?[^#\s]*id=)([\w-]{10,})/i);
  if (!match) return text;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
}

module.exports = { normalizeImageUrl, driveFolderId };
