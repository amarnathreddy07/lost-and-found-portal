const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Student@123';

const PRELOADED_USERS = [
  {
    name: 'Amarnath Reddy',
    email: 'amarnathreddy.s-29@scds.saiuniversity.edu.in',
    studentId: 'SAI-29SCDS-001'
  },
  {
    name: 'Arjun Mehta',
    email: 'arjunmehta.a-21@scds.saiuniversity.edu.in',
    studentId: 'SAI-21CS-014'
  },
  {
    name: 'Meera Iyer',
    email: 'meeraiyer.m-22@ece.saiuniversity.edu.in',
    studentId: 'SAI-22EC-031'
  },
  {
    name: 'Kabir Shah',
    email: 'kabirshah.k-20@me.saiuniversity.edu.in',
    studentId: 'SAI-20ME-008'
  },
  {
    name: 'Diya Nair',
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

module.exports = { DEFAULT_USER_PASSWORD, PRELOADED_USERS, departmentFromEmail, findPreloadedUser };
