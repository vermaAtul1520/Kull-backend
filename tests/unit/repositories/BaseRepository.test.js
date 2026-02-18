const { BaseRepository } = require('../../../repositories/BaseRepository');

describe('BaseRepository DynamoDB Filter Expression Builder', () => {
    let repo;

    beforeEach(() => {
        repo = new BaseRepository('Test', 'test-table');
        // Force DynamoDB mode
        process.env.DB_TYPE = 'dynamodb';
        repo.dbType = 'dynamodb';
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

    describe('_normalizeCriteria', () => {
        it('should map community to communityId for DynamoDB', () => {
            const criteria = { community: '123' };
            const normalized = repo._normalizeCriteria(criteria);
            expect(normalized.communityId).toBe('123');
            expect(normalized.community).toBeUndefined();
        });

        it('should stringify object values for DynamoDB', () => {
            const criteria = { community: { _id: '123' } };
            const normalized = repo._normalizeCriteria(criteria);
            expect(normalized.communityId).toBe('123');
        });

        it('should handle $or with community mapping', () => {
            const criteria = {
                $or: [
                    { community: '123' },
                    { firstName: 'John' }
                ]
            };
            const normalized = repo._normalizeCriteria(criteria);
            expect(normalized.$or[0].communityId).toBe('123');
            expect(normalized.$or[1].firstName).toBe('John');
        });

        it('should not modify criteria if not in DynamoDB mode', () => {
            process.env.DB_TYPE = 'mongodb';
            repo.dbType = 'mongodb';
            const criteria = { community: '123' };
            const normalized = repo._normalizeCriteria(criteria);
            expect(normalized.community).toBe('123');
            expect(normalized.communityId).toBeUndefined();
        });
    });
});
