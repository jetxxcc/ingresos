const fs = require('fs');
const os = require('os');
const path = require('path')
const sqlite3 = require('sqlite3').verbose();

const defaultDbDir = path.join(__dirname, '../db');
let dbDir = defaultDbDir;
let fallbackDbDir;

const ensureWritableDir = (dir) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.accessSync(dir, fs.constants.W_OK);
        return true;
    } catch (err) {
        return false;
    }
};

if (!ensureWritableDir(dbDir)) {
    fallbackDbDir = path.join(os.tmpdir(), 'ingresos-db');
    if (!ensureWritableDir(fallbackDbDir)) {
        throw new Error(`No se puede crear ni escribir en el directorio de la base de datos SQLite: ${fallbackDbDir}`);
    }
    dbDir = fallbackDbDir;
}

const dbPath = path.join(dbDir, 'database.db');
console.log('SQLite dbDir:', dbDir);
console.log('SQLite dbPath:', dbPath);
console.log('dbDir exists:', fs.existsSync(dbDir));
console.log('dbPath exists before open:', fs.existsSync(dbPath));

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error abriendo la base de datos SQLite:', dbPath, err);
        return;
    }
    console.log('SQLite database opened successfully at', dbPath);
    db.run("PRAGMA foreign_keys = ON", (pragmaErr) => {
        if (pragmaErr) {
            console.error('Error al activar foreign_keys:', pragmaErr);
        }
    });
});

module.exports = db;

module.exports = db;
