/**
 * Vercel serverless entry: all /api/* requests are rewritten here (see vercel.json).
 * @see https://vercel.com/docs/functions/serverless-functions/runtimes/node-js
 */
const app = require('../server.js');
module.exports = app;
