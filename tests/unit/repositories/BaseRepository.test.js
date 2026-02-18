const { BaseRepository } = require('../../../repositories/BaseRepository');

describe('BaseRepository DynamoDB Filter Expression Builder', () => {
    let repo;

    beforeEach(() => {
        repo = new BaseRepository('Test', 'test-table');
        // Force DynamoDB mode
        process.env.DB_TYPE = 'dynamodb';
    });

    it('should build simple filter expression', () => {
        const criteria = { name: 'John' };
        const expression = repo._buildFilterExpression(criteria);
        const values = repo._buildFilterValues(criteria);
        const names = repo._buildExpressionNames(criteria);

        expect(expression).toBe('#field0 = :val0');
        expect(values[':val0']).toBe('John');
        expect(names['#field0']).toBe('name');
    });

    it('should build regex filter expression (contains)', () => {
        const criteria = { name: { $regex: 'Jo', $options: 'i' } };
        const expression = repo._buildFilterExpression(criteria);
        const values = repo._buildFilterValues(criteria);
        const names = repo._buildExpressionNames(criteria);

        expect(expression).toBe('contains(#field0, :val0)');
        expect(values[':val0']).toBe('Jo');
        expect(names['#field0']).toBe('name');
    });

    it('should build $or filter expression', () => {
        const criteria = {
            $or: [
                { firstName: 'John' },
                { lastName: { $regex: 'Smi', $options: 'i' } }
            ]
        };
        const expression = repo._buildFilterExpression(criteria);
        const values = repo._buildFilterValues(criteria);
        const names = repo._buildExpressionNames(criteria);

        expect(expression).toContain('(#orField0_0 = :orVal0_0) OR (contains(#orField1_0, :orVal1_0))');
        expect(values[':orVal0_0']).toBe('John');
        expect(values[':orVal1_0']).toBe('Smi');
        expect(names['#orField0_0']).toBe('firstName');
        expect(names['#orField1_0']).toBe('lastName');
    });
});
