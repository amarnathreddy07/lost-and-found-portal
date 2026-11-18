const HEADER_ALIASES = {
  email: ['email', 'emailaddress', 'universityemail', 'collegeemail'],
  name: ['name', 'fullname', 'studentname'],
  studentId: ['prn', 'prnnumber', 'studentid', 'studentcode', 'rollnumber', 'rollno'],
  password: ['password', 'initialpassword', 'temporarypassword']
};

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(input) {
  const text = String(input || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell !== '' || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value !== ''));
}

function parseUserCsv(input) {
  const rows = parseCsv(input);
  if (!rows.length) {
    return { records: [], structureError: 'The CSV file is empty.' };
  }

  const headers = rows[0].map(normalizeHeader);
  const indexes = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    indexes[field] = headers.findIndex((header) => aliases.map(normalizeHeader).includes(header));
  }

  if (indexes.email < 0) {
    return { records: [], structureError: 'CSV must include an email column.' };
  }

  const records = rows.slice(1).map((cells, index) => ({
    row: index + 2,
    email: String(cells[indexes.email] || '').trim(),
    name: indexes.name >= 0 ? String(cells[indexes.name] || '').trim() : '',
    studentId: indexes.studentId >= 0 ? String(cells[indexes.studentId] || '').trim() : '',
    password: indexes.password >= 0 ? String(cells[indexes.password] || '').trim() : ''
  }));

  return { records, structureError: '' };
}

module.exports = { parseCsv, parseUserCsv };
