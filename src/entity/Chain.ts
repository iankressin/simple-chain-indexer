
import { Entity, Column, PrimaryColumn, Unique } from "typeorm";

@Entity()
@Unique(['id'])
export class Chain {
    @PrimaryColumn()
    id: number

    @Column()
    name: string

    @Column()
    rpc: string
}
