import mongoose from "mongoose";

export interface SitePhotoDocument {
  _id: string;
  projectId: string;
  siteId: string;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  isPrimary: boolean;
  isDeleted: boolean;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const sitePhotoSchema = new mongoose.Schema<SitePhotoDocument>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true } as any,
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true } as any,
    title: { type: String, default: "" },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storagePath: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

sitePhotoSchema.index({ projectId: 1, siteId: 1 });

export const SitePhoto = mongoose.model<SitePhotoDocument>("SitePhoto", sitePhotoSchema);
