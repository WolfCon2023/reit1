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

export const mfaLoginSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

export const mfaVerifySetupSchema = z.object({
  token: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordWithCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;
export type MfaLoginBody = z.infer<typeof mfaLoginSchema>;
export type MfaVerifySetupBody = z.infer<typeof mfaVerifySetupSchema>;
export type MfaDisableBody = z.infer<typeof mfaDisableSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordWithCodeBody = z.infer<typeof resetPasswordWithCodeSchema>;
