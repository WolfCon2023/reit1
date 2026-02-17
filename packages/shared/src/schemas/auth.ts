import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleIds: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  roleIds: z.array(z.string()).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;
