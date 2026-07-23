const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'bot.sqlite');
const initSqlPath = path.join(__dirname, 'init.sql');

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

const initSql = fs.readFileSync(initSqlPath, 'utf8');
db.exec(initSql);

module.exports = db;