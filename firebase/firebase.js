const admin = require('firebase-admin');

// Load environment variables (if using a .env file locally)
require('dotenv').config();

// Construct the service account object from environment variables
const serviceAccount = {
  type: process.env.type || 'service_account',
  project_id: process.env.project_id || 'ht-helpdesk',
  private_key_id: process.env.private_key_id || '72a1053f6b86383b2d4c0b94fedf8bcecdd470eb',
  private_key: process.env.private_key || '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCUVpF8zHYCoL29\n7F0cJNcLM+RRsGO4UeiGImxvCS1jFagB6S4el5F+AZ9niOUR8rdvtaFfRnEGD85Z\nKPnfzptDS9M8sTjS4PnwEiVUYDXLNo/Z8NMFIsy8R5tHLt74x9ygrnrdogZ1kLYD\nI0tVGqM1m+iluvYDPIAYzP8dksu8f16hEj7fgelbQVpxTW0q6iUIqI7qAXkD5b1x\nxnlE0PT5J6lmRqx1ZGiXpPa7gUkQYa/MfRQJcWtESMnib8Nh2RVUImJKT9SlSf8C\naGhu4bDUfPpXVPmt6QXcITzjPNt2axA/uP0WOdl2IC/uPVtT3nRlI8JbTiEUdF01\nj52ne8WNAgMBAAECggEAQW1/hV6/jIAuwLchCHldWoUcZ0WYbmO+Xm+PiVgwazxR\nmuopW/f5he0cTLPuacC3VS/1SgtNbeGJ3/y5XhSImiG3PdVjXWw7Ab9XNMSs5YGe\n6H+W6/SB/mfNHxQW5/9rmnnrGpfNJozaIz8tio+RvmMStgrlWN8WFxpQSlCFyZFu\nYYQPMTo9hfxhbWmatCm9WPG5yf2AmW8RmJedRdtMtttX1skx5XhWbDY7cAOiRFdG\nLg5DElFLPUNRUlM950MPuI9rNhYFVFmLBD4l/vi/uy8lBsQmcYj8501QSt7NNHL2\nSV7SZzGh1Pax1zbCU9GjNJnavX0g58keBSrPWqk4lwKBgQDM7As5g0Euf6gKfVoE\nfR42eNY9Yf3FAWY32m5z8OsL+SAPEimW0C3c6qp91LA0FuicEk6w9SWbHUfMU7Wi\njJS6oIlzHKdQCrD2+K05FIy29W3/nUVvzpw1Rr5UjPF/A++EeOz6BbW9v3zZU6Aq\njsQrUkEH+RwrubLQQLjzk6aRVwKBgQC5T/CGRbAhCtjkLPCWUjGRvAtGUUkOB09Z\nPh3J2IE95eq3gQSztVIAJrWHw7S3uDYx/8KNtSWf+pgg6zhTgyYVjBxuqZWo2mzT\nwNW4ZEZ0YiFnGaS5CdYyOW5e+gsnSBUVMuF2qwG0r0dCIR7EzLOZKYM3S9/ZgvZ1\new4JhTVduwKBgQCTJqlEymkDD+5GYg9DC+mnKgyGFZjaYA/b6cHJBeZzOZj42Yz9\n3E4ixmxZYWKKdSzh7g+N6OvxQAxvwGi86gBfJ6qr+5Z11sePAbG6PHRzaThtBq13\nBUGMzFkec/tyvwu+7+sT+wev0xK/KNrp1I0voqhKJmtBRt8NxnxJhOxmjwKBgQCx\n6NxrnKYe4vIeBkMonlq2polQhiOUE1KLxEYHDhPuoDi62mPwQEksmf04DZ0HsRRe\n5kQblmk78PNyz0DxdHzwvOZjG+7yAFnw5jaJY8P8YmXdPNJXT+lTqK2dA4QHv312\nL7YkHsNxe8H27CNFH53hkuhGA1My2TfSzERKwZfdlwKBgCeAJFXPPqY6zORbvjMr\nvlIbE2jdgC5kTQJkYxWQu/CUwHmX4fXHL1t0v64HqGVDREytKtJPhLO0X8T7e5GE\naHfMxdibEz48Jtfb33hQcQsVZXourQg87GQqZFfY6iLrZTOZCDa5dNYW45HakJxJ\nzjsCWaNVz53ucC9zY1frq7Xs\n-----END PRIVATE KEY-----\n',
  client_email: process.env.client_email || 'firebase-adminsdk-fbsvc@ht-helpdesk.iam.gserviceaccount.com',
  client_id: process.env.client_id || '113859354794273751576',
  auth_uri: process.env.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.token_uri || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.client_x509_cert_url || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ht-helpdesk.iam.gserviceaccount.com',
  universe_domain: process.env.universe_domain || 'googleapis.com'
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;