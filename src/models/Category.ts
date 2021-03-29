import {
    EntityAlterado,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

import Transaction from './Transaction';

@Entity('categories')
class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @UpdateDateColumn()
    updated_at: Date;

    DummyIncluido: true;
}

export default Category;
