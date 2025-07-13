const admin = require('firebase-admin');
const serviceAccount = require('../ht-helpdesk-firebase-adminsdk-fbsvc-8b64833108.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});