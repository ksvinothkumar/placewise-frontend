import { http } from '../http';

/** One module of the permission catalog: `perms` are [permissionKey, label] pairs. */
export interface PermissionModule {
  module: string;
  perms: [string, string][];
}
export interface RoleRow {
  key: string;
  name: string;
  kind: 'staff' | 'client' | string;
  builtIn: boolean;
  description?: string;
  users: number;
  /** only present for callers allowed to see them */
  permissions?: string[];
}
export interface RolesView {
  roles: RoleRow[];
  /** only for `roles:manage` */
  catalog?: PermissionModule[];
}
export interface CreateRoleInput {
  name: string;
  /** key of the role whose permissions to start from; '' = blank */
  copyFrom?: string;
}

export const rolesApi = {
  base: '/roles',
  list: () => http.get<RolesView>('/roles'),
  create: (body: CreateRoleInput) => http.post<RoleRow>('/roles', body),
  savePermissions: (key: string, permissions: string[]) => http.put<RoleRow>(`/roles/${key}`, { permissions }),
  remove: (key: string) => http.delete<void>(`/roles/${key}`),
};
