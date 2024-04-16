const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

let db = new sqlite3.Database(':memory:');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS notification_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type_id INTEGER NOT NULL,
    interval TEXT NOT NULL,
    limit_count INTEGER NOT NULL,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_type_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id)
  )
`);

function checkRateLimit(userId, notificationType, callback) {
  const sql = `
    SELECT rl.limit_count, rl.interval, nt.id AS notification_type_id
    FROM rate_limits AS rl
    INNER JOIN notification_types AS nt ON rl.notification_type_id = nt.id
    WHERE nt.name = ?
  `;

  db.get(sql, [notificationType], (err, row) => {
    if (err) {
      callback(err, null);
      return;
    }

    if (!row) {
      callback(new Error('Invalid notification type'), null);
      return;
    }

    const limitCount = row.limit_count;
    const interval = row.interval;
    const notificationTypeId = row.notification_type_id;

    const windowStart = calculateWindowStart(interval);

    const countSql = `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ? AND notification_type_id = ? AND timestamp >= ?
    `;

    db.get(countSql, [userId, notificationTypeId, windowStart], (err, countRow) => {
      if (err) {
        callback(err, null);
        return;
      }

      const notificationCount = countRow.count;

      if (notificationCount >= limitCount) {
        callback(new Error('Rate limit exceeded for this notification type'), null);
      } else {
        callback(null, true);
      }
    });
  });
}

function sendNotification(userId, notificationType, message, callback) {
  getUser(userId, (err, user) => {
    if (err) {
      callback(err);
      return;
    }

    if (!user) {
      callback(new Error('User not found'));
      return;
    }

    const userEmail = user.email;

    const mailOptions = {
      from: 'mrsketchco@gmail.com',
      to: userEmail,
      subject: `Notification: ${notificationType}`,
      text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        callback(error);
        return;
      }

      console.log('Notification sent successfully:', info.response);
      callback(null);
    });
  });
}

const userId = 1;
const notificationType = 'News';
const message = 'Daily news update!';

checkRateLimit(userId, notificationType, (err, canSend) => {
  if (err) {
    console.error('Error checking rate limit:', err.message);
  } else if (canSend) {
    sendNotification(userId, notificationType, message, (err) => {
      if (err) {
        console.error('Error sending notification:', err.message);
      } else {
        console.log('Notification sent successfully!');
      }
    });
  } else {
    console.log('Rate limit exceeded for News notifications.');
  }
});

function calculateWindowStart(interval) {
  const now = new Date();

  switch (interval) {
    case 'minute':
      now.setMinutes(now.getMinutes() - 1);
      break;
    case 'hour':
      now.setHours(now.getHours() - 1);
      break;
    case 'day':
      now.setDate(now.getDate() - 1);
      break;
    default:
      throw new Error('Invalid interval unit');
  }

  return now.toISOString();
}

db.close();
