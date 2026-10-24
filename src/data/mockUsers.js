import { ROLES } from '../utils/constants';

/**
 * Mock user database for development authentication.
 * Supports login via College ID or Email.
 */
export const MOCK_USERS = [
  {
    userId: 'STU-2026-001',
    id: 'STU-2026-001',
    name: 'Aarav Sharma',
    email: 'student@college.edu',
    collegeId: 'STU1001',
    password: 'password123',
    role: ROLES.STUDENT,
    department: 'Computer Science & Engineering',
    yearSemester: '3rd Year / 6th Semester',
    avatar: null,
  },
  {
    userId: 'FAC-2026-042',
    id: 'FAC-2026-042',
    name: 'Dr. Rajesh Deshmukh',
    email: 'faculty@college.edu',
    collegeId: 'FAC2001',
    password: 'password123',
    role: ROLES.FACULTY,
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    avatar: null,
  },
  {
    userId: 'ADM-2026-001',
    id: 'ADM-2026-001',
    name: 'Campus Estate Administrator',
    email: 'admin@college.edu',
    collegeId: 'ADM3001',
    password: 'password123',
    role: ROLES.ADMIN,
    department: 'Estate & Facilities Office',
    designation: 'Chief Estate Manager',
    avatar: null,
  },
  // Additional aliases to preserve backwards compatibility with any existing saved sessions
  {
    userId: 'STU-2026-002',
    id: 'STU-2026-002',
    name: 'Aarav Sharma',
    email: 'stu.2026@college.edu',
    collegeId: '22CS089',
    password: 'password123',
    role: ROLES.STUDENT,
    department: 'Computer Science & Engineering',
    yearSemester: '3rd Year / 6th Semester',
    avatar: null,
  },
  {
    userId: 'FAC-2026-043',
    id: 'FAC-2026-043',
    name: 'Dr. Rajesh Deshmukh',
    email: 'prof.deshmukh@college.edu',
    collegeId: 'FAC-CS-09',
    password: 'password123',
    role: ROLES.FACULTY,
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    avatar: null,
  },
];

export const DEFAULT_MOCK_PASSWORD = 'password123';
