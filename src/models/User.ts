import { Schema, model, type InferSchemaType } from 'mongoose'

const WorkExperienceSchema = new Schema(
  {
    id: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String },
    isCurrent: { type: Boolean, required: true, default: false },
    description: { type: String, required: true },
    technologies: { type: [String], default: [] },
  },
  { _id: false }
)

const EducationSchema = new Schema(
  {
    id: { type: String, required: true },
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    gpa: { type: String },
  },
  { _id: false }
)

const UserProfileSchema = new Schema(
  {
    headline: { type: String, default: '' },
    summary: { type: String, default: '' },
    phone: { type: String },
    location: { type: String, default: '' },
    linkedin: { type: String },
    portfolio: { type: String },
    github: { type: String },
    workExperience: { type: [WorkExperienceSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    skills: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    languages: { type: [String], default: [] },
  },
  { _id: false }
)

const PreferencesSchema = new Schema(
  {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    staleThresholdDays: { type: Number, default: 14 },
    notifyDeadlines: { type: Boolean, default: true },
    notifyFollowUps: { type: Boolean, default: true },
    notifyStale: { type: Boolean, default: true },
    hasCompletedOnboarding: { type: Boolean, default: false },
  },
  { _id: false }
)

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String },
    photoURL: { type: String },
    profile: { type: UserProfileSchema, default: {} },
    preferences: { type: PreferencesSchema, default: {} },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string, createdAt: Date, updatedAt: Date }

export const UserModel = model('User', UserSchema)

