const fs = require('fs');
const path = require('path')
const sqlite3 = require('sqlite3').verbose();

const dbDir = path.join(__dirname, '../db');
console.log('SQLite dbDir:', dbDir);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
console.log('SQLite dbPath:', dbPath);
console.log('dbDir exists:', fs.existsSync(dbDir));
console.log('dbPath exists before open:', fs.existsSync(dbPath));
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error abriendo la base de datos SQLite:', dbPath, err);
        return;
    }
    console.log('SQLite database opened successfully');
    db.run("PRAGMA foreign_keys = ON", (pragmaErr) => {
        if (pragmaErr) {
            console.error('Error al activar foreign_keys:', pragmaErr);
        }
    });
});

module.exports = db;
