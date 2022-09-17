"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostResolver = void 0;
const Vote_1 = require("../entities/Vote");
const type_graphql_1 = require("type-graphql");
const Post_1 = require("../entities/Post");
const isAuth_1 = require("../middleware/isAuth");
const typeormConfig_1 = require("../typeormConfig");
let postInput = class postInput {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], postInput.prototype, "title", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], postInput.prototype, "discription", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], postInput.prototype, "img_url", void 0);
postInput = __decorate([
    (0, type_graphql_1.InputType)()
], postInput);
let PaginatedPosts = class PaginatedPosts {
};
__decorate([
    (0, type_graphql_1.Field)(() => [Post_1.Posts]),
    __metadata("design:type", Array)
], PaginatedPosts.prototype, "posts", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], PaginatedPosts.prototype, "hasMore", void 0);
PaginatedPosts = __decorate([
    (0, type_graphql_1.ObjectType)()
], PaginatedPosts);
let PostResolver = class PostResolver {
    async singlePost(id) {
        return await Post_1.Posts.findOne({
            where: {
                id,
            },
        });
    }
    async vote(vote, postId, { req }) {
        const user_id = req.session.userId;
        let realVote2;
        if (vote == 1) {
            realVote2 = 1;
        }
        else {
            realVote2 = -1;
        }
        const firstTimeORnot = await Vote_1.Vote.findOne({
            where: { userId: user_id, postId },
        });
        if (firstTimeORnot && firstTimeORnot.value === realVote2) {
            console.log("you voted already and you are changing your vote");
            await typeormConfig_1.connection.transaction(async (tm) => {
                await tm.query(`
            update vote
            set value = $1 
            where "postId" = $2 and "userId" = $3      
          `, [0, postId, user_id]);
                await tm.query(`
            update posts
            set points = points + $1
            where id = $2
          `, [realVote2, postId]);
            });
        }
        else if (!firstTimeORnot) {
            console.log("voting for the first time");
            await typeormConfig_1.connection.transaction(async (tm) => {
                await tm.query(`
            insert into vote ("userId", "postId", value)
            values ($1, $2, $3)      
          `, [user_id, postId, realVote2]);
                await tm.query(`
            update posts
            set points = points + $1
            where id = $2
          `, [realVote2, postId]);
            });
        }
        return true;
    }
    async posts(limit, cursor) {
        const realLimit = Math.min(50, limit);
        const checkForHasMore = realLimit + 1;
        const param = [checkForHasMore];
        if (cursor) {
            param.push(new Date(parseInt(cursor)));
        }
        const posts = await typeormConfig_1.connection.query(`
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
    `, param);
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === checkForHasMore,
        };
    }
    async createPost(input, { req }) {
        return await Post_1.Posts.create(Object.assign(Object.assign({}, input), { creatorId: req.session.userId })).save();
    }
    async updatePost(id, title) {
        const post = await Post_1.Posts.findOne({ where: { id } });
        if (!post) {
            return null;
        }
        if (typeof title !== "undefined") {
            await Post_1.Posts.update({ id }, { title });
        }
        return Post_1.Posts.findOne({ where: { id } });
    }
    async deletePost(id) {
        await Post_1.Posts.delete(id);
        return true;
    }
    async vote_status({ req }, post) {
        const a = await Vote_1.Vote.findOne({
            where: {
                postId: post.id,
                userId: req.session.userId,
            },
        });
        if ((a === null || a === void 0 ? void 0 : a.value) == undefined) {
            return null;
        }
        return a === null || a === void 0 ? void 0 : a.value;
    }
    async SearchPost(query) {
        const formattedQuery = query.trim().replace(/ /g, " & ");
        const blogs = await typeormConfig_1.connection
            .getRepository(Post_1.Posts)
            .createQueryBuilder()
            .select("posts")
            .from(Post_1.Posts, "posts")
            .where(`to_tsvector(posts.title) @@ to_tsquery(:query)`, {
            query: `${formattedQuery}:*`,
        })
            .getMany();
        return blogs;
    }
    async sortedPosts(limit, cursor) {
        const realLimit = Math.min(50, limit);
        const checkForHasMore = realLimit + 1;
        const param = [checkForHasMore];
        if (cursor) {
            param.push(new Date(parseInt(cursor)));
        }
        const posts = await typeormConfig_1.connection.query(`
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
      order by p."points" DESC
      limit $1
    `, param);
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === checkForHasMore,
        };
    }
};
__decorate([
    (0, type_graphql_1.Query)(() => Post_1.Posts),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "singlePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("vote")),
    __param(1, (0, type_graphql_1.Arg)("postId", () => String)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "posts", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Posts),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("input")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [postInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Posts, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __param(1, (0, type_graphql_1.Arg)("title")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
__decorate([
    (0, type_graphql_1.FieldResolver)(() => type_graphql_1.Int, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __param(1, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Post_1.Posts]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote_status", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Post_1.Posts]),
    __param(0, (0, type_graphql_1.Arg)("query")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "SearchPost", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "sortedPosts", null);
PostResolver = __decorate([
    (0, type_graphql_1.Resolver)(Post_1.Posts)
], PostResolver);
exports.PostResolver = PostResolver;
//# sourceMappingURL=post.js.map