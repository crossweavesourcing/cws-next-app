import * as z from 'zod/v4';
import { ObjectIdSchema, IsoDateTimeSchema } from '../primitives';

export const UserRoleSchema = z.enum(['super_admin', 'admin', 'manager']).meta({
  description: 'User role for RBAC',
  example: 'super_admin',
});

export const UserStatusSchema = z.enum(['active', 'suspended', 'disabled', 'deleted']).meta({
  description: 'Account status',
  example: 'active',
});

export const UserProfileResponseSchema = z
  .object({
    id: ObjectIdSchema,
    role: UserRoleSchema,
    status: UserStatusSchema,
    profile: z.object({
      displayName: z.string().meta({ example: 'Johnny' }),
      fullName: z.string().nullable().meta({ example: 'John Doe' }),
      employeeId: z.string().nullable().meta({ example: 'EMP-0001' }),
      department: z.string().nullable().meta({ example: 'Engineering' }),
    }),
    createdAt: IsoDateTimeSchema,
  })
  .meta({ id: 'UserProfile' });

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
