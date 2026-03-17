import mongoose from 'mongoose'

export async function connectDb(mongoUri: string): Promise<void> {
  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri)
}

