// The Client ID is public by design. Never put a client secret in front-end code.
export const CONFIG = Object.freeze({
  CLIENT_ID: "PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com",
  DOMAIN: "thapar.edu", // sign-in hint; set to "" to test with a personal Gmail
  MAX_MAIL: 40,
  QUERY: "newer_than:30d",
});
