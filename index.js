require('dotenv').config();
const app = require('./src/app.js');
const db = require('./src/models/db.js');

const PORT = process.env.PORT || 3000;

if (db.ready) {
  db.ready.then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  }).catch((error) => {
    console.error('No se pudo inicializar la base de datos:', error);
    process.exit(1);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
