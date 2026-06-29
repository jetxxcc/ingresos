const path = require('path')
const sqlite3 = require('sqlite3').verbose();


const dbPath = path.join(__dirname, '../db/database.db');
const db = new sqlite3.Database(dbPath);


// ❗ Importante
// SQLite no activa las restricciones de clave foránea por defecto, debes hacerlo manualmente cada vez que abras conexión:
// Activar claves foráneas
db.run("PRAGMA foreign_keys = ON");

module.exports = db;
