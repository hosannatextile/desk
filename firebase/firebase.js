const admin = require('firebase-admin');

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
);

// Fix escaped newlines in private_key
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
