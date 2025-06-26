/**
 * Centralized test user credentials for use across tests
 * This avoids hardcoding credentials in multiple test files
 */

export type TestUserRole = 'admin' | 'survivor' | 'nikita';

export interface TestUser {
  username: string;
  password: string;
  role: TestUserRole;
}

export interface TestUsers {
  [key: string]: TestUser;
}

/**
 * Predefined test users with their credentials and roles
 * Use these constants in tests instead of hardcoding values
 */
export const TEST_USERS: TestUsers = {
  admin: {
    username: 'admin',
    password: 'Admin123!',
    role: 'admin',
  },
  regularUser: {
    username: 'testuser',
    password: 'Password123!',
    role: 'survivor',
  },
  nikita: {
    username: 'nikita',
    password: 'Password123!',
    role: 'nikita',
  },
  // New test users for registration tests
  newUser: {
    username: 'new_test_user',
    password: 'Password123!',
    role: 'survivor',
  },
  duplicateUser: {
    username: 'duplicate_user',
    password: 'Password123!',
    role: 'survivor',
  },
  weakPasswordUser: {
    username: 'usertest',
    password: 'password',
    role: 'survivor',
  },
};
