import csvparse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Category from '../models/Category';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
    title: string;
    type: 'income' | 'outcome';
    value: number;
    category: string;
}

class ImportTransactionsService {
    async execute(fileName: string): Promise<Transaction[]> {
        const transactionsRepository = getCustomRepository(
            TransactionsRepository,
        );
        const categoriesRepository = getRepository(Category);

        const transactionStream = fs.createReadStream(fileName);

        const parseRs = csvparse({
            from_line: 2,
        });

        const parseCSV = transactionStream.pipe(parseRs);

        const transactions: CSVTransaction[] = [];
        const categories: string[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) =>
                cell.trim(),
            );

            if (!title || !type || !value) return;

            categories.push(category);
            transactions.push({ title, type, value, category });
        });

        await new Promise(resolve => parseCSV.on('end', resolve));

        // Todas as categorias
        const existentCategories = await categoriesRepository.find({
            where: { title: In(categories) },
        });
        // Somente os títulos de todas as categorias
        const existentCategoriesTitles = existentCategories.map(c => c.title);
        // Somente os títulos das categorias não existentes
        const addCategoriesTitles = categories
            .filter(c => !existentCategoriesTitles.includes(c))
            // Somente a primeira ocorrência
            .filter((value, index, self) => self.indexOf(value) === index);

        const newCategories = categoriesRepository.create(
            addCategoriesTitles.map(title => ({ title })),
        );

        await categoriesRepository.save(newCategories);

        const finalCategories = [...newCategories, ...existentCategories];

        const createdTransactions = transactionsRepository.create(
            transactions.map(transaction => ({
                title: transaction.title,
                type: transaction.type,
                value: transaction.value,
                category: finalCategories.find(
                    category => category.title === transaction.category,
                ),
            })),
        );

        await transactionsRepository.save(createdTransactions);

        await fs.promises.unlink(fileName);

        return createdTransactions;
    }
}

export default ImportTransactionsService;
