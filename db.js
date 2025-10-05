const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('./connectful.db');

const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

module.exports = db;
