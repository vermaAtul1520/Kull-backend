const { queryParser } = require('./middleware/queryParser');

const req = { query: {} };
const res = { status: () => ({ json: console.log }) };
const next = () => console.log('Next called');

console.log('--- Test 1: No limit passed, default 50 ---');
const middleware = queryParser({ defaultLimit: 50, maxLimit: 50 });
middleware(req, res, () => {
    console.log('Parsed Limit:', req.parsedQuery.limit);
});

console.log('--- Test 2: Limit 5 passed ---');
req.query = { limit: '5' };
middleware(req, res, () => {
    console.log('Parsed Limit:', req.parsedQuery.limit);
});

console.log('--- Test 3: No default, fallback 10 ---');
const middleware2 = queryParser({ maxLimit: 50 });
req.query = {};
middleware2(req, res, () => {
    console.log('Parsed Limit:', req.parsedQuery.limit);
});
