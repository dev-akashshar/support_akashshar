const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(__dirname, '../database/database.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
    // Performance and integrity pragma settings
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
  }
  return dbInstance;
}

const db = {
  instance: getDatabase,

  exec(sql) {
    return getDatabase().exec(sql);
  },

  query(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    return stmt.all(...params);
  },

  queryOne(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    const result = stmt.get(...params);
    return result || null;
  },

  execute(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    return stmt.run(...params);
  },

  transaction(callback) {
    const rawDb = getDatabase();
    rawDb.exec('BEGIN TRANSACTION;');
    try {
      const result = callback(db);
      rawDb.exec('COMMIT;');
      return result;
    } catch (error) {
      rawDb.exec('ROLLBACK;');
      throw error;
    }
  }
};

module.exports = db;
