/**
 * Database adapter — Upstash Redis (production) or in-memory (local dev)
 *
 * Production (Vercel + Upstash):
 *   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
 *   Data persists across deployments and serverless cold starts.
 *
 * Local dev (no Upstash env vars):
 *   Falls back to in-memory store + .local-db/ JSON files on disk.
 *
 * Collections stored in Redis as JSON strings under key: "col:{name}"
 * Each collection is a JSON array of documents.
 */

// ── Upstash Redis ──────────────────────────────────────────────────────────────
let redis = null;

function getRedis() {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Lazy import so the module doesn't crash when the package isn't installed
  const { Redis } = require('@upstash/redis');
  redis = new Redis({ url, token });
  return redis;
}

// ── Local fallback (in-memory + disk) ─────────────────────────────────────────
import fs   from 'fs';
import path from 'path';

const DB_DIR     = path.join(process.cwd(), '.local-db');
const memStore   = global.__localDb || (global.__localDb = {});

function localLoad(name) {
  if (memStore[name]) return memStore[name];
  const file = path.join(DB_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    try { memStore[name] = JSON.parse(fs.readFileSync(file, 'utf-8')); return memStore[name]; }
    catch (e) { console.error('[db] load error', name, e.message); }
  }
  memStore[name] = [];
  return memStore[name];
}

function localSave(name, data) {
  memStore[name] = data;
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  } catch (e) { console.error('[db] save error', name, e.message); }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function matches(item, query) {
  for (const [k, v] of Object.entries(query)) {
    if (item[k] !== v) return false;
  }
  return true;
}

function applySort(data, sortObj) {
  const out = [...data];
  for (const [k, order] of Object.entries(sortObj)) {
    out.sort((a, b) => order === -1 ? (b[k] ?? 0) - (a[k] ?? 0) : (a[k] ?? 0) - (b[k] ?? 0));
  }
  return out;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Collection class ───────────────────────────────────────────────────────────
class Collection {
  constructor(name) { this.name = name; }

  // Load full collection array from Redis or local
  async _load() {
    const r = getRedis();
    if (r) {
      try {
        const raw = await r.get(`col:${this.name}`);
        if (!raw) return [];
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        console.error('[db] Redis load error', this.name, e.message);
        return [];
      }
    }
    return localLoad(this.name);
  }

  // Save full collection array to Redis or local
  async _save(data) {
    const r = getRedis();
    if (r) {
      try {
        await r.set(`col:${this.name}`, JSON.stringify(data));
      } catch (e) {
        console.error('[db] Redis save error', this.name, e.message);
      }
      return;
    }
    localSave(this.name, data);
  }

  find(query = {}) {
    const col = this;
    const result = {
      _query: query,
      _sort:  null,
      sort(s) { this._sort = s; return this; },
      async toArray() {
        let data = await col._load();
        data = data.filter(item => matches(item, result._query));
        if (result._sort) data = applySort(data, result._sort);
        return data;
      }
    };
    return result;
  }

  async findOne(query = {}) {
    const data = await this._load();
    return data.find(item => matches(item, query)) || null;
  }

  async insertOne(doc) {
    const data = await this._load();
    const newDoc = { _id: genId(), ...doc };
    data.push(newDoc);
    await this._save(data);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const data = await this._load();
    const newDocs = docs.map(d => ({ _id: d._id || genId(), ...d }));
    data.push(...newDocs);
    await this._save(data);
    return { insertedCount: newDocs.length };
  }

  async updateOne(query, update, options = {}) {
    const data  = await this._load();
    const index = data.findIndex(item => matches(item, query));
    const set   = update.$set !== undefined ? update.$set : update;

    if (index !== -1) {
      data[index] = { ...data[index], ...set };
      await this._save(data);
      return { modifiedCount: 1, upsertedId: null };
    }
    if (options.upsert) {
      const newId  = query._id !== undefined ? query._id : genId();
      data.push({ _id: newId, ...set });
      await this._save(data);
      return { modifiedCount: 0, upsertedId: newId };
    }
    return { modifiedCount: 0, upsertedId: null };
  }

  async deleteMany(query = {}) {
    const data  = await this._load();
    const kept  = data.filter(item => !matches(item, query));
    await this._save(kept);
    return { deletedCount: data.length - kept.length };
  }

  async deleteOne(query = {}) {
    const data  = await this._load();
    const index = data.findIndex(item => matches(item, query));
    if (index !== -1) {
      data.splice(index, 1);
      await this._save(data);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
}

// ── Database class ─────────────────────────────────────────────────────────────
class Database {
  collection(name) { return new Collection(name); }
}

const dbInstance = new Database();

export async function getDb() {
  return dbInstance;
}

export default Database;
