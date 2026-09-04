import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { buildSeedData, demoPassword } from "../seed/data.js";
import { collectionMap, models } from "../models/index.js";

const clone = (value) => structuredClone(value);

/**
 * Some seed collections (sellers, most notably) identify records with `id`
 * rather than `_id`. MongoDB mode copies `id` into `_id` on upsert, so anything
 * addressed by `_id` — every `get`/`update` call — silently missed the record in
 * memory mode. Normalising up front keeps the two modes addressable the same way
 * while leaving the original `id` in place for the code that matches on it.
 */
const withIds = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([key, values]) => [
      key,
      Array.isArray(values)
        ? values.map((value) =>
            value && typeof value === "object" && !value._id && value.id
              ? { ...value, _id: value.id }
              : value,
          )
        : values,
    ]),
  );

class DataStore {
  constructor() {
    this.mode = "memory";
    this.data = withIds(buildSeedData());
  }

  async initialize(mode = "memory") {
    this.mode = mode;
    if (mode === "memory") {
      const passwordHash = await bcrypt.hash(demoPassword, 10);
      this.data.users = this.data.users.map((u) => ({ ...u, passwordHash }));
    }
  }

  async ensureDemoData() {
    if (this.mode !== "mongodb") return { inserted: 0 };

    const data = buildSeedData();
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    data.users = data.users.map((user) => ({ ...user, passwordHash }));

    let inserted = 0;
    for (const [key, modelName] of Object.entries(collectionMap)) {
      const values = (data[key] || []).map((value) =>
        value._id || !value.id ? value : { ...value, _id: value.id },
      );
      if (!values.length) continue;

      const result = await models[modelName].bulkWrite(
        values.map((value) => ({
          updateOne: {
            filter: { _id: value._id },
            update: { $setOnInsert: value },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      inserted += result.upsertedCount || 0;
    }

    const managedDemoIds = new Set([
      "user-consumer",
      "user-business",
      "user-farmer",
      "user-fpo",
      "user-fpo-puri",
      "user-fpo-balasore",
      "user-logistics",
      "user-admin",
      "user-driver",
      "user-driver-bulk",
      "user-driver-store",
      "user-fleet",
    ]);
    for (const user of data.users.filter((item) => managedDemoIds.has(item._id))) {
      const current = await models.User.findById(user._id).lean();
      if (current && current.email !== user.email) {
        await models.User.updateOne(
          { _id: user._id },
          { $set: { email: user.email, passwordHash } },
        );
      }
    }

    return { inserted };
  }

  model(key) {
    return models[collectionMap[key]];
  }

  async list(key, filter = {}, session = null) {
    if (this.mode === "mongodb")
      return this.model(key).find(filter).session(session).lean();
    return clone(
      (this.data[key] || []).filter((item) =>
        Object.entries(filter).every(([field, value]) => {
          if (value?.$in) return value.$in.includes(item[field]);
          return item[field] === value;
        }),
      ),
    );
  }

  async find(key, predicateOrFilter, session = null) {
    if (this.mode === "mongodb")
      return this.model(key).findOne(predicateOrFilter).session(session).lean();
    const predicate =
      typeof predicateOrFilter === "function"
        ? predicateOrFilter
        : (item) =>
            Object.entries(predicateOrFilter).every(
              ([field, value]) => item[field] === value,
            );
    return clone((this.data[key] || []).find(predicate) || null);
  }

  async get(key, id, session = null) {
    if (this.mode === "mongodb")
      return this.model(key).findById(id).session(session).lean();
    return clone(
      (this.data[key] || []).find((item) => item._id === id) || null,
    );
  }

  async create(key, value, prefix = key.slice(0, 4), session = null) {
    const record = {
      _id: value._id || `${prefix}-${nanoid(8)}`,
      ...value,
      createdAt: value.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (this.mode === "mongodb")
      return (
        await this.model(key).create([record], { session })
      )[0].toObject();
    this.data[key] ||= [];
    this.data[key].push(record);
    return clone(record);
  }

  async update(key, id, changes, session = null) {
    if (this.mode === "mongodb")
      return this.model(key)
        .findByIdAndUpdate(id, { $set: changes }, { new: true, session })
        .lean();
    const index = (this.data[key] || []).findIndex((item) => item._id === id);
    if (index < 0) return null;
    this.data[key][index] = {
      ...this.data[key][index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    return clone(this.data[key][index]);
  }

  async remove(key, id, session = null) {
    if (this.mode === "mongodb")
      return this.model(key).findByIdAndDelete(id, { session }).lean();
    const index = (this.data[key] || []).findIndex((item) => item._id === id);
    if (index < 0) return null;
    return clone(this.data[key].splice(index, 1)[0]);
  }

  async insertMany(key, values) {
    if (this.mode === "mongodb")
      return this.model(key).insertMany(values, { ordered: false });
    this.data[key] = clone(values);
    return this.data[key];
  }

  async transaction(work) {
    if (this.mode !== "mongodb") return work(null);
    const topology = mongoose.connection.client?.topology?.description?.type;
    if (!["ReplicaSetWithPrimary", "Sharded"].includes(topology))
      return work(null);
    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}

export const store = new DataStore();
