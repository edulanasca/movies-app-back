import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema, resolvers, users } from './schema';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error('SECRET_KEY is not set in the environment variables');
  process.exit(1);
}

app.use(cookieParser());

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as { username: string };
      req.user = users[decoded.username];
    } catch (err) {
      console.error('Invalid token', err?.toString());
    }
  }
  next();
};

app.use(authMiddleware);

app.use('/graphql', graphqlHTTP((req: any, res) => ({
  schema: schema,
  rootValue: resolvers,
  graphiql: process.env.NODE_ENV !== 'production',
  context: { user: req.user, res },
})));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/graphql`);
});