const sqlite3 = require('sqlite3').verbose();

// Se establece la base de datos en memoria
let db = new sqlite3.Database(':memory:');


// Función para verificar el límite de velocidad
function checkRateLimit(userId, type, callback) {
  const sql = `
    SELECT count(*) AS count
    FROM notifications
    WHERE user_id = ? AND type = ? AND timestamp >= datetime('now', '-' || (SELECT interval || 's' FROM rate_limits WHERE type = ?))
  `;

  db.get(sql, [userId, type, type], (err, row) => {
    if (err) {
      callback(err, null);
      return;
    }

    const count = row.count;

    db.get('SELECT limit_count FROM rate_limits WHERE type = ?', [type], (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }

      const limitCount = row.limit_count;

      if (count < limitCount) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  });
}

// Función para enviar una notificación
function sendNotification(userId, type, message, callback) {
  checkRateLimit(userId, type, (err, canSend) => {
    if (err) {
      callback(err);
      return;
    }

    if (canSend) {
      const sql = `
        INSERT INTO notifications (user_id, type, message, timestamp) VALUES (?, ?, ?, datetime('now'))
      `;

      db.run(sql, [userId, type, message], (err) => {
        if (err) {
          callback(err);
          return;
        }

        callback(null);
      });
    } else {
      callback(new Error('El usuario ha alcanzado el límite de velocidad para este tipo de notificación.'));
    }
  });
}

// Configuración de parámetros
const userId = 1;
const type = 'news';
const message = '¡Nueva noticia!';
const limitCount = 10; // Ejemplo de límite de velocidad
const intervalTime = 60000; // Ejemplo de intervalo de tiempo en milisegundos

// Pruebas de envío de notificaciones

// Prueba de límite de velocidad alcanzado
/* sendNotificationsUntilLimitReached(userId, type, message, limitCount, (err) => {
  if (err) {
    console.error('Error al enviar la notificación:', err.message);
  } else {
    console.log('El límite de velocidad se alcanzó correctamente.');
  }
}); */

// Prueba de límite de velocidad no alcanzado
/* sendNotificationsUnderLimit(userId, type, message, limitCount, (err) => {
  if (err) {
    console.error('Error al enviar la notificación:', err.message);
  } else {
    console.log('Notificaciones enviadas correctamente sin alcanzar el límite de velocidad.');
  }
}); */

// Prueba de intervalo de tiempo
setTimeout(() => {
  sendNotification(userId, type, message, (err) => {
    if (err) {
      console.error('Error al enviar la notificación después del intervalo de tiempo:', err.message);
    } else {
      console.log('Notificación enviada correctamente después del intervalo detiempo.');
    }
  });
}, intervalTime);

// Prueba de tipos de notificación múltiples
const notificationTypes = ['news', 'update', 'marketing'];

notificationTypes.forEach((notificationType) => {
  sendNotification(userId, notificationType, message, (err) => {
    if (err) {
      console.error(`Error al enviar la notificación de tipo ${notificationType}:`, err.message);
    } else {
      console.log(`Notificación de tipo ${notificationType} enviada correctamente.`);
    }
  });
});

// Cerrar la conexión a la base de datos
db.close();
