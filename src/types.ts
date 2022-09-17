import { Request, Response } from "express";
import "express-session";
import Redis from "ioredis";

declare module "express-session" {
  export interface SessionData {
    userId: any;
  }
}

export type Things = {
  req: Request;
  res: Response;
  redis: Redis;
};
