import mongoose from 'mongoose'
import { config } from './env.js'

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  })
}
