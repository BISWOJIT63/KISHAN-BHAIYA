import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { buildSeedData, demoPassword } from "./data.js";
import { collectionMap, models } from "../models/index.js";

const connection = await connectDatabase();
if (!connection.connected) {
  console.error(
    "MongoDB is required for the seed command. Start MongoDB or use the automatic memory demo mode.",
  );
  process.exit(1);
}
const databaseName = mongoose.connection.name;
if (
  process.env.NODE_ENV === "production" ||
  !/^kisanexpress(?:-|$)/i.test(databaseName)
) {
  console.error(
    `Refusing to replace collections in non-demo database "${databaseName}". Use a database name beginning with kisanexpress outside production.`,
  );
  process.exit(1);
}
const data = buildSeedData();
const passwordHash = await bcrypt.hash(demoPassword, 10);
data.users = data.users.map((u) => ({ ...u, passwordHash }));
for (const [key, modelName] of Object.entries(collectionMap)) {
  await models[modelName].deleteMany({});
  if (data[key]?.length) await models[modelName].insertMany(data[key]);
}
console.log(
  `KisanExpress seed complete: ${data.products.length} products, ${data.lots.length} lots, ${data.requirements.length} requirements.`,
);
await mongoose.disconnect();
