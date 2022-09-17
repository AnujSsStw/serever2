import { User } from "../entities/User";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { Things } from "../types";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { registerVaildation } from "../utils/registerVaildation";
import { Mail } from "../utils/mails";
import { v4 as uuidv4 } from "uuid";

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  error?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() root: User, @Ctx() { req }: Things) {
    console.log("here");
    if (req.session.userId === root.id) {
      return root.email;
    }

    return "";
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: Things) {
    if (!req.session.userId) {
      return null;
    }
    return await User.findOne({ where: { id: req.session.userId } });
  }

  @Query(() => [User])
  listofUsers() {
    return User.find();
  }

  @Mutation(() => UserResponse)
  async register(
    @Ctx() { req }: Things,
    @Arg("registerOptions") registerOptions: UsernamePasswordInput
  ): Promise<UserResponse> {
    const error = registerVaildation(registerOptions);
    if (error) {
      return { error };
    }

    const hashedPassword = await argon2.hash(registerOptions.password);
    const user = User.create({
      email: registerOptions.email,
      username: registerOptions.username,
      password: hashedPassword,
    });
    try {
      await user.save();
    } catch (err) {
      if (err.detail.includes("Key (email)=(me@me) already exists")) {
        return {
          error: [
            {
              field: "email",
              message: "email already taken",
            },
          ],
        };
      }
      // console.log(err);
      if (err.code === "23505") {
        // same error code for username and email
        return {
          error: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
      }
    }
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Ctx() { req }: Things,
    @Arg("emailORusername") emailORusername: string,
    @Arg("password") password: string
  ): Promise<UserResponse> {
    const user = await User.findOne({
      where: emailORusername.includes("@")
        ? { email: emailORusername }
        : { username: emailORusername },
    });
    if (!user) {
      return {
        error: [
          {
            field: "emailORusername",
            message: "that username doesn't exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        error: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: Things) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie("mycookie");
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("userORemail") userORemail: string,
    @Ctx() { redis }: Things
  ) {
    let user;

    userORemail.includes("@")
      ? (user = await User.findOne({ where: { email: userORemail } }))
      : (user = await User.findOne({ where: { username: userORemail } }));

    if (!user) {
      return false;
    }
    const token = uuidv4();
    await redis.set(
      "Forget-Password" + token,
      user.id,
      "EX",
      1000 * 60 * 60 * 24
    );

    await Mail(
      user.email,
      `<a href="http://localhost:3000/reset-password/${token}">reset Password</a>`
    );

    return true;
  }

  @Mutation(() => UserResponse)
  async resetPassword(
    @Arg("newPassword") newPassword: string,
    @Arg("token") token: string,
    @Ctx() { redis, req }: Things
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        error: [
          {
            field: "newPassword",
            message: "password must be at least 3 characters long",
          },
        ],
      };
    }

    const userId = await redis.get("Forget-Password" + token);
    console.log(userId);
    if (!userId) {
      return {
        error: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }
    const id = userId;
    const user = await User.findOne({ where: { id: id } });
    if (!user) {
      return {
        error: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(newPassword);
    await User.update({ id: id }, { password: hashedPassword });

    // log in user after reseting password
    req.session.userId = user.id;

    await redis.del("Forget-Password" + token);

    return { user };
  }
}
