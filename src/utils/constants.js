export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.FACULTY]: 'Faculty',
  [ROLES.ADMIN]: 'Administrator',
};

export const ROLE_HOME_ROUTES = {
  [ROLES.STUDENT]: '/student/dashboard',
  [ROLES.FACULTY]: '/faculty/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
};
