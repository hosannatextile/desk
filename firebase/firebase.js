const admin = require('firebase-admin');
const serviceAccount = require('../ht-helpdesk-firebase-adminsdk-fbsvc-fcb9b9fde1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});