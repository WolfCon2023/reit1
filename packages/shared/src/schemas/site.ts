import { z } from "zod";

const dropdownMode = z.enum(["preset", "manual"]);

export const structureTypeFieldSchema = z.object({
  structureTypeMode: z.enum(["preset", "manual"]).default("preset"),
  structureTypeValue: z.string().min(1),
});

export const stateFieldSchema = z.object({
  stateMode: z.enum(["preset", "manual"]).default("preset"),
  stateValue: z.string().min(1),
});

export const providerResidentFieldSchema = z.object({
  providerResidentMode: z.enum(["preset", "manual"]).default("preset"),
  providerResidentValue: z.string().min(1),
});

export const siteCreateSchema = z.object({
  siteId: z.string().min(1, "SITE ID is required"),
  siteName: z.string().min(1, "SITE NAME is required"),
  areaName: z.string().optional(),
  districtName: z.string().optional(),
  provider: z.string().min(1, "PROVIDER is required"),
  providerResidentMode: dropdownMode.default("preset"),
  providerResidentValue: z.string().min(1),
  address: z.string().min(1, "ADDRESS is required"),
  city: z.string().min(1, "CITY is required"),
  county: z.string().optional(),
  stateMode: dropdownMode.default("preset"),
  stateValue: z.string().min(1, "STATE is required"),
  zipCode: z.string().min(1, "ZIP CODE is required"),
  cmaId: z.string().optional(),
  cmaName: z.string().optional(),
  structureTypeMode: dropdownMode.default("preset"),
  structureTypeValue: z.string().min(1, "STRUCTURE TYPE is required"),
  siteType: z.string().optional(),
  ge: z.string().optional(),
  structureHeight: z.number().min(0).default(0),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  siteAltId: z.string().optional(),
});

export const siteUpdateSchema = siteCreateSchema.partial();

export type SiteCreate = z.infer<typeof siteCreateSchema>;
export type SiteUpdate = z.infer<typeof siteUpdateSchema>;
