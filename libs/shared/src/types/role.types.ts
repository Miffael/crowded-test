/**
 * Role defines the access level for a user.
 * - admin: Can create and block customers/users, and manage accounts and payments.
 * - operator: Has access only to accounts and payments.
 */
export type Role = 'admin' | 'operator';
