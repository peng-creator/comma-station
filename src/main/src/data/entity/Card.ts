import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Card {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    front!: string;

    @Column()
    back!: string;

    @Column()
    file!: string;

    @Column()
    source!: string; // JSON, snippet of the file.

    @Column()
    dueDate!: number;

    @Column()
    interval!: number;

    @Column()
    repetition!: number;

    @Column()
    efactor!: number;

    @Column()
    createTime!: number;

    @Column()
    updateTime!: number;

    @Column()
    createdBy!: number;

}
