import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { connection } from "./typeormConfig";
import { Things } from "./types";
// import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

const main = async () => {
  await connection.initialize();
  console.log("Connected to database");
  // await connection.runMigrations();

  const app = express();

  // for sandbox environment
  app.set("trust proxy", true);
  // app.set("Access-Control-Allow-Origin", "https://studio.apollographql.com");
  // app.set("Access-Control-Allow-Credentials", true);

  // redis@v4
  const RedisStore = connectRedis(session);
  // const redisClient = createClient({ legacyMode: true });
  // redisClient.connect().then(() => console.log("Connected to Redis"));

  const redis = new Redis();

  app.use(
    session({
      name: "mycookie",
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true, // client side js can't access cookie
        secure: false, // cookie only works over https
        sameSite: "lax",
      },
      saveUninitialized: false,
      secret: "fasfafadfafafaferw",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): Things => ({ req, res, redis }),
    // plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: {
      credentials: true,
      origin: ["http://localhost:3000", "https://studio.apollographql.com"],
    },
  });
  app.listen(4000, () => console.log("Listening on port 4000"));
};

main().catch((error) => console.log(error));
