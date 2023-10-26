
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, Unique } from "typeorm";
import { Account } from "./Account";
import { Chain } from "./Chain";

@Entity()
@Unique(['hash'])
export class Transaction {
    @PrimaryColumn()
    hash: string

    @Column()
    block: number

    @ManyToOne(() => Account)
    from: Account

    @ManyToOne(() => Account)
    to: Account

    @ManyToOne(() => Chain)
    chain: Chain
}
