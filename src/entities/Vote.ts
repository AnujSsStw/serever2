import { ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Posts } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Vote extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  postId: string;

  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => User, (user) => user.votes)
  user: User;

  @ManyToOne(() => Posts, (post) => post.votes)
  post: Posts;
}
