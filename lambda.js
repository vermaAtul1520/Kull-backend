// lambda.js - AWS Lambda entry point for KULL Backend
const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./index');

let serverlessExpressInstance;

const { initializeDatabase } = require('./db');

async function setup(event, context) {
  // Ensure DB is initialized before processing request
  await initializeDatabase();
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop (important for MongoDB)
  context.callbackWaitsForEmptyEventLoop = false;

  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }

  return setup(event, context);
};
