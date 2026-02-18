import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  companyName: z.string().max(200).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
