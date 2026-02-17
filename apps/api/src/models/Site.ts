import mongoose from "mongoose";
import type { SiteDocument } from "@reit1/shared";

const siteSchema = new mongoose.Schema<SiteDocument>(
  {
    siteId: { type: String, required: true, unique: true },
    siteName: { type: String, required: true },
    areaName: String,
    districtName: String,
    provider: { type: String, required: true },
    providerResidentMode: { type: String, enum: ["preset", "manual"], default: "preset" },
    providerResidentValue: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    county: String,
    stateMode: { type: String, enum: ["preset", "manual"], default: "preset" },
    stateValue: { type: String, required: true },
    zipCode: { type: String, required: true },
    zipFull: String,
    cmaId: String,
    cmaName: String,
    structureTypeMode: { type: String, enum: ["preset", "manual"], default: "preset" },
    structureTypeValue: { type: String, required: true },
    siteType: String,
    ge: String,
    structureHeight: { type: Number, default: 0, min: 0 },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    latitudeNad83: { type: Number, required: true },
    longitudeNad83: { type: Number, required: true },
    siteAltId: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

siteSchema.index({ siteId: 1 }, { unique: true });
siteSchema.index({ isDeleted: 1, stateValue: 1, provider: 1, structureTypeValue: 1, providerResidentValue: 1 });
siteSchema.index({ isDeleted: 1, siteName: "text", siteId: "text", address: "text", city: "text" });

export const Site = mongoose.model<SiteDocument>("Site", siteSchema);
