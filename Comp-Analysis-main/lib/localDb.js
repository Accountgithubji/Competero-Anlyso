/**
 * In-memory database with optional file persistence.
 * - In development: persists to .local-db/ JSON files on disk
 * - In production/serverless: uses in-memory store (data resets on cold start)
 *
 * This means the frontend and backend run in the same Next.js process —
 * no separate backend deployment needed.
 */

import fs from 'fs';
import path from 'path';

const IS_DEV = process.env.NODE_ENV !== 'production';
const DB_DIR = path.join(process.cwd(), '.local-db');

// Global in-memory store — survives hot reloads in dev, persists across requests
const globalStore = global.__localDb || (global.__localDb = {});

function loadCollection(name) {
  // Already in memory
  if (globalStore[name]) return globalStore[name];

  // Try loading from disk in dev
  if (IS_DEV) {
    const filePath = path.join(DB_DIR, `${name}.json`);
    if (fs.existsSync(filePath)) {
      try {
        globalStore[name] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return globalStore[name];
      } catch (e) {
        console.error(`[localDb] Error loading ${name}:`, e.message);
      }
    }
  }

  globalStore[name] = [];
  return globalStore[name];
}

function saveCollection(name, data) {
  globalStore[name] = data;

  // Persist to disk in dev
  if (IS_DEV) {
    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
      fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[localDb] Error saving ${name}:`, e.message);
    }
  }
}

function matchesQuery(item, query) {
  for (const [key, value] of Object.entries(query)) {
    if (item[key] !== value) return false;
  }
  return true;
}

function sortData(data, sortObj) {
  const sorted = [...data];
  for (const [key, order] of Object.entries(sortObj)) {
    sorted.sort((a, b) =>
      order === -1 ? (b[key] ?? 0) - (a[key] ?? 0) : (a[key] ?? 0) - (b[key] ?? 0)
    );
  }
  return sorted;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class Collection {
  constructor(name) {
    this.name = name;
  }

  find(query = {}) {
    const name = this.name;
    const result = {
      _query: query,
      _sort: null,
      sort(sortObj) { this._sort = sortObj; return this; },
      toArray() {
        let data = loadCollection(name);
        data = data.filter(item => matchesQuery(item, result._query));
        if (result._sort) data = sortData(data, result._sort);
        return data;
      }
    };
    return result;
  }

  findOne(query = {}) {
    const data = loadCollection(this.name);
    return data.find(item => matchesQuery(item, query)) || null;
  }

  insertOne(doc) {
    const data = loadCollection(this.name);
    const newDoc = { _id: generateId(), ...doc };
    data.push(newDoc);
    saveCollection(this.name, data);
    return { insertedId: newDoc._id };
  }

  insertMany(docs) {
    const data = loadCollection(this.name);
    const newDocs = docs.map(doc => ({ _id: doc._id || generateId(), ...doc }));
    data.push(...newDocs);
    saveCollection(this.name, data);
    return { insertedCount: newDocs.length };
  }

  updateOne(query, update, options = {}) {
    const data = loadCollection(this.name);
    const index = data.findIndex(item => matchesQuery(item, query));
    const setData = update.$set !== undefined ? update.$set : update;

    if (index !== -1) {
      data[index] = { ...data[index], ...setData };
      saveCollection(this.name, data);
      return { modifiedCount: 1, upsertedId: null };
    } else if (options.upsert) {
      const newId = query._id !== undefined ? query._id : generateId();
      const newDoc = { _id: newId, ...setData };
      data.push(newDoc);
      saveCollection(this.name, data);
      return { modifiedCount: 0, upsertedId: newId };
    }
    return { modifiedCount: 0, upsertedId: null };
  }

  deleteMany(query = {}) {
    const data = loadCollection(this.name);
    const kept = data.filter(item => !matchesQuery(item, query));
    const deletedCount = data.length - kept.length;
    saveCollection(this.name, kept);
    return { deletedCount };
  }

  deleteOne(query = {}) {
    const data = loadCollection(this.name);
    const index = data.findIndex(item => matchesQuery(item, query));
    if (index !== -1) {
      data.splice(index, 1);
      saveCollection(this.name, data);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
}

class LocalDatabase {
  collection(name) {
    return new Collection(name);
  }
}

const dbInstance = new LocalDatabase();

export async function getDb() {
  return dbInstance;
}

export default LocalDatabase;
