import { DataSource } from "typeorm";
import { Posts } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Vote } from "./entities/Vote";

export const connection = new DataSource({
  type: "postgres",
  username: "postgres",
  password: "postgres",
  port: 5432,
  host: "localhost",
  database: "lireddit",
  entities: [Posts, User, Vote],
  synchronize: true,
  migrations: [path.join(__dirname, "./migrations/*")],
  logging: true,
});
