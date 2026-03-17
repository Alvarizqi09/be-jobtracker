import { Schema, model, type InferSchemaType } from 'mongoose'

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String },
    photoURL: { type: String },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string }

export const UserModel = model('User', UserSchema)

