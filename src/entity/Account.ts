
import { Entity, PrimaryColumn, Unique } from "typeorm"

@Entity()
@Unique(['address'])
export class Account {

    @PrimaryColumn()
    address: string
}
