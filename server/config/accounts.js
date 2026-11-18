const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Student@123';
const UNIVERSITY_EMAIL_PATTERN = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]-\d{2}@[A-Za-z]+(?:-[A-Za-z]+)*\.saiuniversity\.edu\.in$/i;

const PRELOADED_USERS = [
  {
    email: 'amarnathreddy.s-29@scds.saiuniversity.edu.in',
    studentId: 'SAI-29SCDS-001'
  },
  {
    email: 'arjunmehta.a-21@scds.saiuniversity.edu.in',
    studentId: 'SAI-21CS-014'
  },
  {
    email: 'meeraiyer.m-22@ece.saiuniversity.edu.in',
    studentId: 'SAI-22EC-031'
  },
  {
    email: 'kabirshah.k-20@me.saiuniversity.edu.in',
    studentId: 'SAI-20ME-008'
  },
  {
    email: 'diyanair.d-23@llb.saiuniversity.edu.in',
    studentId: 'SAI-23LLB-045'
  }
];

function departmentFromEmail(email) {
  const domain = String(email || '').split('@')[1] || '';
  return domain.split('.')[0].toUpperCase().slice(0, 40);
}

function findPreloadedUser(email) {
  const normalized = String(email || '').toLowerCase().trim();
  return PRELOADED_USERS.find((entry) => entry.email === normalized) || null;
}

module.exports = { DEFAULT_USER_PASSWORD, UNIVERSITY_EMAIL_PATTERN, PRELOADED_USERS, departmentFromEmail, findPreloadedUser };
