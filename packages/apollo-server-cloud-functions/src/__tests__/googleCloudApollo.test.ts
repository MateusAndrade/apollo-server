import { ApolloServer, CreateHandlerOptions } from '../ApolloServer';
import testSuite, {
  schema as Schema,
  CreateAppOptions,
} from 'apollo-server-integration-testsuite';
import type { Config } from 'apollo-server-core';
import express = require('express');
import bodyParser = require('body-parser');
import request from 'supertest';

type GcfRequest = {
  path: string | null;
  host: string | null;
};

const simulateGcfMiddleware = (
  req: express.Request | GcfRequest,
  _: express.Response,
  next: express.NextFunction,
) => {
  // GCF will pass in a null path when accessing the
  // published endpoint directly
  if (req.path === '') {
    req['path'] = null;
  }
  next();
};

const createCloudFunction = async (
  options: CreateAppOptions = {},
  createHandlerOptions: CreateHandlerOptions = {},
) => {
  const handler = new ApolloServer(
    (options.graphqlOptions as Config) || { schema: Schema },
  ).createHandler(createHandlerOptions);

  const app = express();
  app.use(bodyParser.json());
  app.use(simulateGcfMiddleware);
  app.use(handler);
  return app;
};

describe('googleCloudApollo', () => {
  it('handles requests with path set to null', async () => {
    const app = await createCloudFunction(
      {},
      { expressGetMiddlewareOptions: { path: '/' } },
    );
    const res = await request(app).get('/').set('Accept', 'text/html');
    expect(res.status).toEqual(200);
  });
});

describe('integration:CloudFunction', () => {
  testSuite({ createApp: createCloudFunction, serverlessFramework: true });
});
