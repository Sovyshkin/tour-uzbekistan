import { UserRole } from '@prisma/client';

export const isCmsRole = (role: UserRole) =>
  role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN || role === UserRole.MANAGER;

export const isAdministratorRole = (role: UserRole) =>
  role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;

export const isPrivilegeElevation = (currentRole: UserRole, nextRole: UserRole) => {
  const level = (role: UserRole) => role === UserRole.SUPER_ADMIN ? 2 : role === UserRole.ADMIN ? 1 : 0;
  return level(nextRole) > level(currentRole);
};
