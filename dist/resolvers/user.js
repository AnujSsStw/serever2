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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = void 0;
const User_1 = require("../entities/User");
const type_graphql_1 = require("type-graphql");
const argon2_1 = __importDefault(require("argon2"));
const UsernamePasswordInput_1 = require("./UsernamePasswordInput");
const registerVaildation_1 = require("../utils/registerVaildation");
const mails_1 = require("../utils/mails");
const uuid_1 = require("uuid");
let UserResponse = class UserResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], UserResponse.prototype, "error", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], UserResponse.prototype, "user", void 0);
UserResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], UserResponse);
let FieldError = class FieldError {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    (0, type_graphql_1.ObjectType)()
], FieldError);
let UserResolver = class UserResolver {
    email(root, { req }) {
        console.log("here");
        if (req.session.userId === root.id) {
            return root.email;
        }
        return "";
    }
    async me({ req }) {
        if (!req.session.userId) {
            return null;
        }
        return await User_1.User.findOne({ where: { id: req.session.userId } });
    }
    listofUsers() {
        return User_1.User.find();
    }
    async register({ req }, registerOptions) {
        const error = (0, registerVaildation_1.registerVaildation)(registerOptions);
        if (error) {
            return { error };
        }
        const hashedPassword = await argon2_1.default.hash(registerOptions.password);
        const user = User_1.User.create({
            email: registerOptions.email,
            username: registerOptions.username,
            password: hashedPassword,
        });
        try {
            await user.save();
        }
        catch (err) {
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
            if (err.code === "23505") {
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
    async login({ req }, emailORusername, password) {
        const user = await User_1.User.findOne({
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
        const valid = await argon2_1.default.verify(user.password, password);
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
    logout({ req, res }) {
        return new Promise((resolve) => req.session.destroy((err) => {
            res.clearCookie("mycookie");
            if (err) {
                console.log(err);
                resolve(false);
                return;
            }
            resolve(true);
        }));
    }
    async forgotPassword(userORemail, { redis }) {
        let user;
        userORemail.includes("@")
            ? (user = await User_1.User.findOne({ where: { email: userORemail } }))
            : (user = await User_1.User.findOne({ where: { username: userORemail } }));
        if (!user) {
            return false;
        }
        const token = (0, uuid_1.v4)();
        await redis.set("Forget-Password" + token, user.id, "EX", 1000 * 60 * 60 * 24);
        await (0, mails_1.Mail)(user.email, `<a href="http://localhost:3000/reset-password/${token}">reset Password</a>`);
        return true;
    }
    async resetPassword(newPassword, token, { redis, req }) {
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
        const user = await User_1.User.findOne({ where: { id: id } });
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
        const hashedPassword = await argon2_1.default.hash(newPassword);
        await User_1.User.update({ id: id }, { password: hashedPassword });
        req.session.userId = user.id;
        await redis.del("Forget-Password" + token);
        return { user };
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_1.User, Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "email", null);
__decorate([
    (0, type_graphql_1.Query)(() => User_1.User, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "me", null);
__decorate([
    (0, type_graphql_1.Query)(() => [User_1.User]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "listofUsers", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Ctx)()),
    __param(1, (0, type_graphql_1.Arg)("registerOptions")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UsernamePasswordInput_1.UsernamePasswordInput]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Ctx)()),
    __param(1, (0, type_graphql_1.Arg)("emailORusername")),
    __param(2, (0, type_graphql_1.Arg)("password")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "logout", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("userORemail")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "forgotPassword", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Arg)("newPassword")),
    __param(1, (0, type_graphql_1.Arg)("token")),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "resetPassword", null);
UserResolver = __decorate([
    (0, type_graphql_1.Resolver)(User_1.User)
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=user.js.map