import type { Permission } from "./permissions.js";

export interface ProjectDocument {
  _id: string;
  name: string;
  description?: string;
  companyName?: string;
  tags?: string[];
  isArchived: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteDocument {
  _id: string;
  projectId: string;
  siteId: string;
  siteName: string;
  areaName?: string;
  districtName?: string;
  provider: string;
  providerResidentMode: "preset" | "manual";
  providerResidentValue: string;
  address: string;
  city: string;
  county?: string;
  stateMode: "preset" | "manual";
  stateValue: string;
  zipCode: string;
  zipFull?: string;
  cmaId?: string;
  cmaName?: string;
  structureTypeMode: "preset" | "manual";
  structureTypeValue: string;
  siteType?: string;
  ge?: string;
  structureHeight: number;
  latitude: number;
  longitude: number;
  latitudeNad83: number;
  longitudeNad83: number;
  siteAltId?: string;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface UserDocument {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDocument {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditDocument {
  _id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ImportBatchDocument {
  _id: string;
  projectId: string;
  importName?: string;
  uploadedBy: string;
  uploadedAt: Date;
  filename: string;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  errorDetails: Array<{ row: number; errors: string[] }>;
  validRows?: Record<string, unknown>[];
  status: "pending" | "committed" | "partial";
  createdAt: Date;
  updatedAt: Date;
}

export interface ZipCacheDocument {
  _id: string;
  zip: string;
  city?: string;
  state?: string;
  county?: string;
  updatedAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  userId: string;
  email: string;
  permissions: Permission[];
}
