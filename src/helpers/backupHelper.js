const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
require('dotenv').config();

class BackupHelper {
    constructor() {
        this.dbDir = path.join(__dirname, '..', 'db');
        const configuredBackupDir = typeof process.env.ROUTEBACKUP === 'string' && process.env.ROUTEBACKUP.trim() !== ''
            ? process.env.ROUTEBACKUP.trim()
            : null;
        this.backupDir = configuredBackupDir || path.join(this.dbDir, 'backups', 'auto');
        this.autoBackupFile = path.join(this.backupDir || path.join(this.dbDir, 'backups', 'auto'), 'backup.db');
        const sqliteBinary = process.platform === 'win32' ? 'sqlite3.exe' : 'sqlite3';
        this.sqlite3Path = path.join(this.dbDir, sqliteBinary);
        this.ensureDirectoriesExist();
    }

    ensureDirectoriesExist() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async makeAutoBackup() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(this.dbDir, 'database.db');
            
            if (!fs.existsSync(dbPath)) {
                return reject(new Error(`La base de datos no existe en: ${dbPath}`));
            }

            const useSqlite3 = fs.existsSync(this.sqlite3Path);

            if (!useSqlite3) {
                console.warn(`No se encontró sqlite3 binario en: ${this.sqlite3Path}. Usando copia directa.`);
                return this.tryAlternativeBackupMethod().then(resolve).catch(reject);
            }

            // ELIMINAR el archivo de backup existente si está vacío o corrupto
            if (fs.existsSync(this.autoBackupFile)) {
                const stats = fs.statSync(this.autoBackupFile);
                if (stats.size === 0) {
                    console.log('Eliminando archivo de backup vacío...');
                    fs.unlinkSync(this.autoBackupFile);
                }
            }

            console.log('Ejecutando backup con sqlite3...');
            const command = `cd "${this.dbDir}" && "${this.sqlite3Path}" "database.db" ".backup '${this.autoBackupFile}'"`;
            console.log('Ejecutando comando:', command);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error ejecutando comando sqlite3:', error);
                    // Intentar método alternativo si falla
                    this.tryAlternativeBackupMethod()
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                if (stderr && !stderr.includes('already exists')) {
                    console.log('Stderr:', stderr);
                }
                
                console.log('Backup completado');
                
                this.verifyBackup()
                    .then(isValid => {
                        if (isValid) {
                            console.log('✅ Backup verificado correctamente');
                            resolve(this.autoBackupFile);
                        } else {
                            console.log('❌ El backup está vacío, intentando método alternativo...');
                            this.tryAlternativeBackupMethod()
                                .then(resolve)
                                .catch(reject);
                        }
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        });
    }

    async tryAlternativeBackupMethod() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(this.dbDir, 'database.db');
            
            console.log('Intentando método alternativo: copia directa...');
            
            // Primero eliminar el archivo de backup si existe
            if (fs.existsSync(this.autoBackupFile)) {
                fs.unlinkSync(this.autoBackupFile);
            }
            
            fs.copyFile(dbPath, this.autoBackupFile, (err) => {
                if (err) {
                    console.error('Error copiando archivo:', err);
                    return reject(err);
                }
                
                console.log('Copia directa completada');
                
                // Verificar que la copia sea válida
                this.verifyBackup()
                    .then(isValid => {
                        if (isValid) {
                            console.log('✅ Copia directa verificada correctamente');
                            resolve(this.autoBackupFile);
                        } else {
                            reject(new Error('La copia directa también está vacía'));
                        }
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        });
    }

    async verifyBackup() {
        return new Promise((resolve) => {
            try {
                if (!fs.existsSync(this.autoBackupFile)) {
                    return resolve(false);
                }
                
                const backupStats = fs.statSync(this.autoBackupFile);
                console.log(`Tamaño del backup: ${backupStats.size} bytes`);
                
                const mainDbPath = path.join(this.dbDir, 'database.db');
                if (!fs.existsSync(mainDbPath)) {
                    return resolve(backupStats.size > 1024); // Mínimo 1KB
                }
                
                const mainDbStats = fs.statSync(mainDbPath);
                console.log(`Tamaño de DB principal: ${mainDbStats.size} bytes`);
                
                // Considerar válido si tiene al menos el 10% del tamaño original y más de 10KB
                const isValid = backupStats.size > (mainDbStats.size * 0.1) && backupStats.size > 10240;
                resolve(isValid);
            } catch (error) {
                console.error('Error verificando backup:', error);
                resolve(false);
            }
        });
    }
}

module.exports = BackupHelper;