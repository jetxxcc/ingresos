const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const defaultDbDir = path.join(__dirname, '../db');
let dbDir = defaultDbDir;

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
    const fallbackDbDir = path.join(os.tmpdir(), 'ingresos-db');
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

let resolveReady;
let rejectReady;
const dbReady = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
});

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error abriendo la base de datos SQLite:', dbPath, err);
        rejectReady(err);
        return;
    }

    console.log('SQLite database opened successfully at', dbPath);
    db.serialize(() => {
        db.run("PRAGMA foreign_keys = ON");

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 0,
                last_login TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creando tabla users:', createErr);
                rejectReady(createErr);
                return;
            }

            db.get(`SELECT COUNT(*) AS count FROM users`, [], async (countErr, row) => {
                if (countErr) {
                    console.error('Error contando usuarios:', countErr);
                    rejectReady(countErr);
                    return;
                }

                if (row && row.count === 0) {
                    const adminName = process.env.ADMIN_NAME || 'Administrador';
                    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
                    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

                    try {
                        const hashedPassword = await bcrypt.hash(adminPassword, 12);
                        db.run(`
                            INSERT INTO users (name, username, password, is_admin, is_active)
                            VALUES (?, ?, ?, 1, 1)
                        `, [adminName, adminUsername, hashedPassword], function (insertErr) {
                            if (insertErr) {
                                console.error('Error insertando usuario admin inicial:', insertErr);
                            } else {
                                console.log(`Usuario admin inicial creado: ${adminUsername}`);
                                console.log('Si estás usando credenciales por defecto, cambia ADMIN_USERNAME y ADMIN_PASSWORD en el despliegue.');
                            }
                            resolveReady();
                        });
                    } catch (hashErr) {
                        console.error('Error generando contraseña admin:', hashErr);
                        rejectReady(hashErr);
                    }
                } else {
                    resolveReady();
                }
            });
        });
    });
});

db.ready = dbReady;
module.exports = db;
