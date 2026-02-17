import { z } from "zod";

export const importCommitSchema = z.object({
  batchId: z.string().min(1),
});

export type ImportCommitBody = z.infer<typeof importCommitSchema>;
