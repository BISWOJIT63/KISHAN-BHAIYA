import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { store } from "./services/dataStore.js";

let appPromise;

const initializeApp = async () => {
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
  return createApp();
};

export const getApp = () => {
  appPromise ??= initializeApp().catch((error) => {
    appPromise = undefined;
    throw error;
  });
  return appPromise;
};
