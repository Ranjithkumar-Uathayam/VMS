export type UserRole = 'admin' | 'manager' | 'vendor' | 'watchman'| 'inventory';

export interface User {
  name: string;
  role: UserRole;
  // Vendor-specific properties
  mobileNumber?: string;
  partyCode?: string;
  // Member-specific properties
  username?: string;
}