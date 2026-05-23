import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), '.local-db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

class LocalDatabase {
  getCollectionPath(name) {
    return path.join(DB_DIR, `${name}.json`);
  }

  loadCollection(name) {
    const filePath = this.getCollectionPath(name);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`[localDb] Error loading ${name}:`, e.message);
        return [];
      }
    }
    return [];
  }

  saveCollection(name, data) {
    try {
      fs.writeFileSync(this.getCollectionPath(name), JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[localDb] Error saving ${name}:`, e.message);
    }
  }

  matchesQuery(item, query) {
    for (const [key, value] of Object.entries(query)) {
      if (item[key] !== value) return false;
    }
    return true;
  }

  sortData(data, sortObj) {
    const sorted = [...data];
    for (const [key, order] of Object.entries(sortObj)) {
      sorted.sort((a, b) => order === -1 ? (b[key] ?? 0) - (a[key] ?? 0) : (a[key] ?? 0) - (b[key] ?? 0));
    }
    return sorted;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  collection(name) {
    const self = this;

    return {
      find(query = {}) {
        const result = {
          _query: query,
          _sort: null,
          sort(sortObj) {
            this._sort = sortObj;
            return this;
          },
          toArray() {
            let data = self.loadCollection(name);
            data = data.filter(item => self.matchesQuery(item, result._query));
            if (result._sort) data = self.sortData(data, result._sort);
            return data;
          }
        };
        return result;
      },

      findOne(query = {}) {
        const data = self.loadCollection(name);
        return data.find(item => self.matchesQuery(item, query)) || null;
      },

      insertOne(doc) {
        const data = self.loadCollection(name);
        const newDoc = { _id: self.generateId(), ...doc };
        data.push(newDoc);
        self.saveCollection(name, data);
        return { insertedId: newDoc._id };
      },

      insertMany(docs) {
        const data = self.loadCollection(name);
        const newDocs = docs.map(doc => ({ _id: doc._id || self.generateId(), ...doc }));
        data.push(...newDocs);
        self.saveCollection(name, data);
        return { insertedCount: newDocs.length };
      },

      updateOne(query, update, options = {}) {
        const data = self.loadCollection(name);
        const index = data.findIndex(item => self.matchesQuery(item, query));
        const setData = update.$set !== undefined ? update.$set : update;

        if (index !== -1) {
          // Preserve existing _id, merge with new data
          data[index] = { ...data[index], ...setData };
          self.saveCollection(name, data);
          return { modifiedCount: 1, upsertedId: null };
        } else if (options.upsert) {
          // Use _id from query if present, otherwise generate one
          const newId = query._id !== undefined ? query._id : self.generateId();
          const newDoc = { _id: newId, ...setData };
          data.push(newDoc);
          self.saveCollection(name, data);
          return { modifiedCount: 0, upsertedId: newId };
        }
        return { modifiedCount: 0, upsertedId: null };
      },

      deleteMany(query = {}) {
        const data = self.loadCollection(name);
        const kept = data.filter(item => !self.matchesQuery(item, query));
        const deletedCount = data.length - kept.length;
        self.saveCollection(name, kept);
        return { deletedCount };
      },

      deleteOne(query = {}) {
        const data = self.loadCollection(name);
        const index = data.findIndex(item => self.matchesQuery(item, query));
        if (index !== -1) {
          data.splice(index, 1);
          self.saveCollection(name, data);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };
  }
}

let dbInstance = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = new LocalDatabase();
  }
  return dbInstance;
}

export default LocalDatabase;
