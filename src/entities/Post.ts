import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Vote } from "./Vote";

@ObjectType()
@Entity()
export class Posts extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  creatorId: string;

  @Field(() => Int, { nullable: true })
  vote_status: number | null;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  discription: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points: number;

  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator: User;

  @OneToMany(() => Vote, (vote) => vote.post)
  votes: Vote[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
