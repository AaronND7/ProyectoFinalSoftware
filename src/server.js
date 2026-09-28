const app = require('./app');
const config = require('./config');
const { getDb } = require('./db');

getDb();
app.listen(config.port, () => {
  console.log(`API de donantes escuchando en http://localhost:${config.port}`);
});
