import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class File {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    path!: string;

    @Column()
    level: number = 0;

    @Column()
    epoch!: string;

}
