const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database(':memory:');

function checkRateLimit(userId, type, callback) {
    db.get("SELECT count(*) as count FROM notifications WHERE user_id = ? AND type = ? AND timestamp >= datetime('now', '-' || (SELECT interval || 's' FROM rate_limits WHERE type = ?))", [userId, type, type], (err, row) => {
        if (err) {
            callback(err, null);
            return;
        }
        const count = row.count;
        db.get("SELECT limit_count FROM rate_limits WHERE type = ?", [type], (err, row) => {
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

function sendNotification(userId, type, message, callback) {
    checkRateLimit(userId, type, (err, canSend) => {
        if (err) {
            callback(err);
            return;
        }
        if (canSend) {
            db.run("INSERT INTO notifications (user_id, type, message, timestamp) VALUES (?, ?, ?, datetime('now'))", [userId, type, message], (err) => {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null);
            });
        } else {
            callback(new Error("El usuario ha alcanzado el límite de velocidad para este tipo de notificación."));
        }
    });
}

const userId = 1;
const type = "news";
const message = "¡Nueva noticia!";

sendNotification(userId, type, message, (err) => {
    if (err) {
        console.error("Error al enviar la notificación:", err.message);
    } else {
        console.log("Notificación enviada correctamente.");
    }
});

function sendNotificationsUntilLimitReached(userId, type, message, limitCount, callback) {
    // Verificar el límite de velocidad actual para el usuario y el tipo de notificación
    checkRateLimit(userId, type, (err, canSend) => {
        if (err) {
            // Manejar errores de la verificación del límite de velocidad
            callback(err);
            return;
        }
        
        // Si se puede enviar la notificación según el límite de velocidad actual
        if (canSend) {
            // Enviar la notificación
            sendNotification(userId, type, message, (err) => {
                if (err) {
                    // Manejar errores al enviar la notificación
                    callback(err);
                } else {
                    // Incrementar el contador de notificaciones enviadas
                    limitCount--;
                    // Verificar si se ha alcanzado el límite de velocidad
                    if (limitCount > 0) {
                        // Si no se ha alcanzado el límite, enviar más notificaciones recursivamente
                        sendNotificationsUntilLimitReached(userId, type, message, limitCount, callback);
                    } else {
                        // Si se ha alcanzado el límite, devolver un mensaje de éxito
                        callback(null, "El límite de velocidad se alcanzó correctamente.");
                    }
                }
            });
        } else {
            // Si no se puede enviar la notificación debido al límite de velocidad, devolver un mensaje de error
            callback(new Error("El usuario ha alcanzado el límite de velocidad para este tipo de notificación."));
        }
    });
}

db.close();
