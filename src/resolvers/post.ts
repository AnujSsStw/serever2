import { Vote } from "../entities/Vote";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Posts } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { connection } from "../typeormConfig";
import { Things } from "../types";

@InputType()
class postInput {
  @Field()
  title: string;

  @Field()
  discription: string;
}

// const sleep = (a: number) => new Promise((res) => setTimeout(res, a));

@ObjectType()
class PaginatedPosts {
  @Field(() => [Posts])
  posts: Posts[];

  @Field()
  hasMore: boolean;
}

@Resolver(Posts)
export class PostResolver {
  @Mutation(() => Boolean)
  async vote(
    @Arg("vote") vote: number,
    @Arg("postId", () => String) postId: string,
    @Ctx() { req }: Things
  ) {
    const user_id: string = req.session.userId;
    let realVote2: number;
    if (vote >= 1) {
      realVote2 = 1;
    } else {
      realVote2 = -1;
    }

    const firstTimeORnot = await Vote.findOne({
      // give true if user already has a vote
      where: { userId: user_id, postId },
    });

    if (firstTimeORnot && firstTimeORnot.value !== realVote2) {
      console.log("you voted already and you are changing your vote");

      await connection.transaction(async (tm) => {
        await tm.query(
          `
            update vote
            set value = $1 
            where "postId" = $2 and "userId" = $3      
          `,
          [realVote2, postId, user_id]
        );

        await tm.query(
          `
            update posts
            set points = points + $1
            where id = $2
          `,
          [2 * realVote2, postId]
        );
      });
    } else if (!firstTimeORnot) {
      console.log("voting for the first time");

      await connection.transaction(async (tm) => {
        await tm.query(
          `
            insert into vote ("userId", "postId", value)
            values ($1, $2, $3)      
          `,
          [user_id, postId, realVote2]
        );

        await tm.query(
          `
            update posts
            set points = points + $1
            where id = $2
          `,
          [realVote2, postId]
        );
      });
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const checkForHasMore = realLimit + 1;
    // const Query = connection
    //   .getRepository(Posts)
    //   .createQueryBuilder("pag")
    //   .leftJoinAndSelect("pag.creator", "user", 'user.id = pag."creatorId"')
    //   .orderBy('user."createdAt"', "DESC")
    //   .take(checkForHasMore);

    // if (cursor) {
    //   Query.where('pag."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await Query.getMany();

    const param: any[] = [checkForHasMore];

    if (cursor) {
      param.push(new Date(parseInt(cursor)));
    }

    const posts = await connection.query(
      `
      select p.*,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'email', u.email,
        'createdAt', u."createdAt",
        'updatedAt', u."updatedAt"
        ) creator
      from posts p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      param
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === checkForHasMore,
    };
  }

  @Mutation(() => Posts)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: postInput,
    @Ctx() { req }: Things
  ): Promise<Posts> {
    return await Posts.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Posts, { nullable: true })
  async updatePost(
    @Arg("id") id: string,
    @Arg("title") title: string
  ): Promise<Posts | null> {
    const post = await Posts.findOne({ where: { id } });
    if (!post) {
      return null;
    }
    if (typeof title !== "undefined") {
      await Posts.update({ id }, { title });
    }
    return Posts.findOne({ where: { id } });
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<Boolean> {
    await Posts.delete(id);
    return true;
  }

  @FieldResolver(() => Int, { nullable: true })
  async vote_status(
    @Ctx() { req }: Things,
    // @Arg("postId", () => String) postId: string,
    @Root() post: Posts
  ) {
    const a = await Vote.findOne({
      where: {
        postId: post.id,
        userId: req.session.userId,
      },
    });

    if (a?.value == undefined) {
      return null;
    }

    return a?.value;
  }
}
