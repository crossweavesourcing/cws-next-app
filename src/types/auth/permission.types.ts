/**
 * Assignable CMS permissions for the manager role.
 * super_admin has all permissions implicitly.
 * admin has 'overview', 'page_content', 'categories', 'products', 'seo' implicitly.
 * manager gets only what is explicitly assigned.
 */
export type CmsPermission =
  | 'overview'
  | 'page_content'
  | 'categories'
  | 'products'
  | 'seo';

/** Fixed permissions that admin role always has (no DB storage needed). */
export const ADMIN_IMPLICIT_PERMISSIONS: readonly CmsPermission[] = [
  'overview',
  'page_content',
  'categories',
  'products',
  'seo',
] as const;

/** All possible CMS permission values (for validation). */
export const ALL_CMS_PERMISSIONS: readonly CmsPermission[] = [
  'overview',
  'page_content',
  'categories',
  'products',
  'seo',
] as const;
