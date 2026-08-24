import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { store } from "./services/dataStore.js";

let initializationPromise;

/**
 * Initializes the shared runtime once per warm process.
 *
 * Local Node starts this before listening. On Vercel, the exported Express app
 * calls it before routing a request, so importing the function never opens a
 * second HTTP server or crashes the serverless bootstrap.
 */
export const initializeRuntime = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const connection = await connectDatabase();
      await store.initialize(connection.mode);

      if (
        connection.connected &&
        env.nodeEnv !== "production" &&
        env.autoSeedDemo &&
        /^kishan-bhaiya-demo(?:-|$)/i.test(mongoose.connection.name)
      ) {
        const seeded = await store.ensureDemoData();
        if (seeded.inserted) {
          console.log(
            `[Kishan Bhaiya] Added ${seeded.inserted} missing records to the dedicated demo database.`,
          );
        }
      }

      return connection;
    })().catch((error) => {
      // A failed cold start must be retriable after variables or database
      // network access have been corrected.
      initializationPromise = undefined;
      throw error;
    });
  }
  return initializationPromise;
};
