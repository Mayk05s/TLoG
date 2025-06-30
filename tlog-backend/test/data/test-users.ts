/**
 * Centralized test user credentials for use across tests
 * This avoids hardcoding credentials in multiple test files
 */

export type TestUserRole = 'admin' | 'survivor' | 'nikita';

export interface TestUser {
  username: string;
  password: string;
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
    username: 'admin_test',
    password: 'Admin123!',
  },
  regularUser: {
    username: 'testuser_test',
    password: 'Password123!',
  },
  nikita: {
    username: 'nikita_test',
    password: 'Password123!',
  },
};
