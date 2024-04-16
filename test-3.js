const sqlite3 = require('sqlite3').verbose();

// Database connection
let db = new sqlite3.Database(':memory:');


function getUser(userId, callback) {
    const sql = `
      SELECT *
      FROM users
      WHERE id = ?
    `;
  
    db.get(sql, [userId], (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }
  
      callback(null, row); // Return user data or null if not found
    });
  }
  

  function getNotificationType(name, callback) {
    const sql = `
      SELECT *
      FROM notification_types
      WHERE name = ?
    `;
  
    db.get(sql, [name], (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }
  
      callback(null, row);
    });
  }
  
// Core rate limiting function
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

    const windowStart = calculateWindowStart(interval); // Implement based on interval (minute, hour, day)

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
        callback(null, true); // User can receive notification
      }
    });
  });
}

function sendNotification(userId, notificationType, message, callback) {
    // 1. Retrieve user email (replace with actual logic)
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
  
      // 2. Implement email sending logic (replace with actual email sending library/service)
      const mailOptions = {
        from: 'sender@yourdomain.com',
        to: userEmail,
        subject: `Notification: ${notificationType}`,
        text: message,
      };
  
      // Replace with your actual email sending library (e.g., nodemailer)
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
  

// Example usage
const userId = 1;
const notificationType = 'News'; // Replace with actual type
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
        now.setMinutes(now.getMinutes() - 1); // Go back 1 minute
        break;
      case 'hour':
        now.setHours(now.getHours() - 1); // Go back 1 hour
        break;
      case 'day':
        now.setDate(now.getDate() - 1); // Go back 1 day
        break;
      default:
        throw new Error('Invalid interval unit');
    }
  
    return now.toISOString();
  }
  