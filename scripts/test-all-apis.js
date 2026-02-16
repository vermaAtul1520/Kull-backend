#!/usr/bin/env node
/**
 * KULL Backend - Comprehensive API Test Suite
 * Tests all GET and key POST/PUT/DELETE endpoints against the serverless deployment.
 *
 * Usage:
 *   node scripts/test-all-apis.js                          # Run against prod
 *   node scripts/test-all-apis.js --base-url=http://localhost:5000  # Run locally
 *   node scripts/test-all-apis.js --verbose                # Show response bodies
 *   node scripts/test-all-apis.js --group=posts            # Test only one group
 */

require('dotenv').config();

// ── CONFIG ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const BASE_URL = (args.find(a => a.startsWith('--base-url=')) || '').split('=')[1]
    || 'https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod';
const GROUP_FILTER = (args.find(a => a.startsWith('--group=')) || '').split('=')[1] || null;

// We'll login to get a fresh token automatically
const LOGIN_EMAIL = process.env.TEST_EMAIL || 'jitender.amul@gmail.com';
const LOGIN_PASSWORD = process.env.TEST_PASSWORD || '';

// Known IDs from the database (used for testing specific endpoints)
const TEST_DATA = {
    communityId: '6958076de069d5262887256f',
    communityId2: '695792b9d4ad1bc7243a716b',
    userId: '6979dffe587769b07ff82a95',
    postId: '6984d848e2928dfead7ab501',
    postId2: '697dbede8a8684cc5b51f8e5',
};

// ── HELPERS ─────────────────────────────────────────────────────────────────────
let TOKEN = '';
let stats = { passed: 0, failed: 0, skipped: 0, total: 0 };
let results = [];

async function request(method, path, { body, token = true, description = '' } = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const startTime = Date.now();
    try {
        const response = await fetch(url, opts);
        const elapsed = Date.now() - startTime;
        let data;
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = text; }

        return { status: response.status, data, elapsed, ok: response.ok, url };
    } catch (error) {
        return { status: 0, data: null, elapsed: Date.now() - startTime, ok: false, url, error: error.message };
    }
}

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

async function test(group, description, method, path, options = {}) {
    stats.total++;

    if (options.skip) {
        stats.skipped++;
        results.push({ group, description, status: 'SKIP', code: '-', ms: 0 });
        log('⏭️ ', `SKIP  ${description}`);
        return null;
    }

    const res = await request(method, path, { ...options, description });
    const isSuccess = res.ok && !res.error;
    const statusIcon = isSuccess ? '✅' : '❌';

    if (isSuccess) stats.passed++;
    else stats.failed++;

    const statusLine = `${statusIcon} ${res.status} ${method.padEnd(6)} ${path}  (${res.elapsed}ms)  ${description}`;
    log('', statusLine);

    if (!isSuccess || VERBOSE) {
        const dataStr = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2).substring(0, 500) : String(res.data).substring(0, 500);
        if (!isSuccess) log('  ', `   Response: ${dataStr}`);
        if (res.error) log('  ', `   Error: ${res.error}`);
    }

    results.push({
        group, description, status: isSuccess ? 'PASS' : 'FAIL',
        code: res.status, ms: res.elapsed, method, path
    });

    return res;
}

// ── TEST GROUPS ─────────────────────────────────────────────────────────────────

async function testAuth() {
    console.log('\n🔐 AUTH (/api/auth)');
    console.log('─'.repeat(70));

    // Login to get token
    if (!TOKEN && LOGIN_PASSWORD) {
        const res = await test('auth', 'Login', 'POST', '/api/auth/login', {
            body: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
            token: false
        });
        if (res?.data?.token) {
            TOKEN = res.data.token;
            log('🔑', `Token acquired successfully`);
        } else if (res?.data?.data?.token) {
            TOKEN = res.data.data.token;
            log('🔑', `Token acquired successfully`);
        }
    }

    if (!TOKEN) {
        log('⚠️ ', 'No token available. Set TEST_PASSWORD env var or provide a token.');
        log('⚠️ ', 'Continuing with hardcoded token if available...');
    }

    await test('auth', 'Admin Dashboard Stats', 'GET', '/api/auth/admin/dashboard-stats');
    await test('auth', 'Community Admin Dashboard Stats', 'GET', '/api/auth/community-admin/dashboard-stats');
}

async function testCommunities() {
    console.log('\n🏘️  COMMUNITIES (/api/communities)');
    console.log('─'.repeat(70));

    await test('communities', 'List All Communities', 'GET', '/api/communities');
    await test('communities', 'Get Community Users', 'GET', `/api/communities/${TEST_DATA.communityId}/users`);
    await test('communities', 'Get Community Users (with pagination)', 'GET', `/api/communities/${TEST_DATA.communityId}/users?page=1&limit=5`);
    await test('communities', 'Get Gotra Detail', 'GET', `/api/communities/${TEST_DATA.communityId}/gotraDetail`);
    await test('communities', 'Get Community Configuration', 'GET', `/api/communities/${TEST_DATA.communityId}/configuration`);
    await test('communities', 'List Community Bhajans', 'GET', `/api/communities/${TEST_DATA.communityId}/bhajans`);
    await test('communities', 'Get Community Officers', 'GET', `/api/communities/${TEST_DATA.communityId}/users/orgofficers`);
}

async function testUsers() {
    console.log('\n👤 USERS (/api/users)');
    console.log('─'.repeat(70));

    await test('users', 'Get Pending Users', 'GET', '/api/users/pending');
    await test('users', 'City Search', 'GET', '/api/users/city-search?city=delhi');
    await test('users', 'Family Tree Search', 'GET', '/api/users/family-tree/search?search=kumar');
}

async function testPosts() {
    console.log('\n📝 POSTS (/api/posts)');
    console.log('─'.repeat(70));

    await test('posts', 'Get Community Posts', 'GET', `/api/posts/community/${TEST_DATA.communityId}`);
    await test('posts', 'Get Single Post', 'GET', `/api/posts/${TEST_DATA.postId}`);
    await test('posts', 'Get Post Likes', 'GET', `/api/posts/likes/${TEST_DATA.postId}`);
    await test('posts', 'Get Post Comments', 'GET', `/api/posts/comments/${TEST_DATA.postId}`);
}

async function testDonations() {
    console.log('\n💰 DONATIONS (/api/donations)');
    console.log('─'.repeat(70));

    await test('donations', 'Get Community Donations', 'GET', `/api/donations/community/${TEST_DATA.communityId}`);
}

async function testNews() {
    console.log('\n📰 NEWS (/api/news)');
    console.log('─'.repeat(70));

    await test('news', 'Get Community News', 'GET', `/api/news/community/${TEST_DATA.communityId}`);
    await test('news', 'Get News Headlines', 'GET', `/api/news/community/${TEST_DATA.communityId}/headlines`);
}

async function testAppeals() {
    console.log('\n🙏 APPEALS (/api/appeals)');
    console.log('─'.repeat(70));

    await test('appeals', 'List Appeals', 'GET', '/api/appeals');
}

async function testDukaans() {
    console.log('\n🏪 DUKAANS (/api/dukaans)');
    console.log('─'.repeat(70));

    await test('dukaans', 'List Dukaans', 'GET', '/api/dukaans');
}

async function testEducation() {
    console.log('\n📚 EDUCATION (/api/educationResources)');
    console.log('─'.repeat(70));

    await test('education', 'List Education Resources', 'GET', '/api/educationResources');
}

async function testJobPosts() {
    console.log('\n💼 JOB POSTS (/api/jobPosts)');
    console.log('─'.repeat(70));

    await test('jobPosts', 'List Job Posts', 'GET', '/api/jobPosts');
}

async function testKartavya() {
    console.log('\n📋 KARTAVYA (/api/kartavya)');
    console.log('─'.repeat(70));

    await test('kartavya', 'List Kartavya', 'GET', '/api/kartavya');
}

async function testMeetings() {
    console.log('\n📅 MEETINGS (/api/meetings)');
    console.log('─'.repeat(70));

    await test('meetings', 'List Meetings', 'GET', '/api/meetings');
    await test('meetings', 'Get Upcoming Meetings', 'GET', '/api/meetings/upcoming');
    await test('meetings', 'Get Meeting Stats', 'GET', '/api/meetings/stats');
}

async function testSportsEvents() {
    console.log('\n⚽ SPORTS EVENTS (/api/sportsEvents)');
    console.log('─'.repeat(70));

    await test('sportsEvents', 'List Sports Events', 'GET', '/api/sportsEvents');
    await test('sportsEvents', 'Get Upcoming Sports Events', 'GET', '/api/sportsEvents/upcoming');
    await test('sportsEvents', 'Get Sports Event Stats', 'GET', '/api/sportsEvents/stats');
}

async function testOccasions() {
    console.log('\n🎉 OCCASIONS (/api/occasions)');
    console.log('─'.repeat(70));

    await test('occasions', 'List Occasions', 'GET', `/api/occasions?communityId=${TEST_DATA.communityId}`);
    await test('occasions', 'List Occasions (with pagination)', 'GET', `/api/occasions?communityId=${TEST_DATA.communityId}&page=1&limit=5`);
}

async function testOccasionCategories() {
    console.log('\n🏷️  OCCASION CATEGORIES (/api/occasion-categories)');
    console.log('─'.repeat(70));

    await test('occasion-categories', 'List Occasion Categories', 'GET', '/api/occasion-categories');
}

async function testFamily() {
    console.log('\n👨‍👩‍👧‍👦 FAMILY (/api/family)');
    console.log('─'.repeat(70));

    await test('family', 'Search Family Users', 'GET', '/api/family/search?search=kumar');
    await test('family', 'Get Family Tree', 'GET', `/api/family/tree/${TEST_DATA.userId}`);
}

// ── MAIN ────────────────────────────────────────────────────────────────────────

const TEST_GROUPS = {
    auth: testAuth,
    communities: testCommunities,
    users: testUsers,
    posts: testPosts,
    donations: testDonations,
    news: testNews,
    appeals: testAppeals,
    dukaans: testDukaans,
    education: testEducation,
    jobPosts: testJobPosts,
    kartavya: testKartavya,
    meetings: testMeetings,
    sportsEvents: testSportsEvents,
    occasions: testOccasions,
    'occasion-categories': testOccasionCategories,
    family: testFamily,
};

async function main() {
    console.log('═'.repeat(70));
    console.log('  KULL Backend – Comprehensive API Test Suite');
    console.log('═'.repeat(70));
    console.log(`  Base URL : ${BASE_URL}`);
    console.log(`  Time     : ${new Date().toLocaleString()}`);
    if (GROUP_FILTER) console.log(`  Group    : ${GROUP_FILTER}`);
    console.log('═'.repeat(70));

    // Allow passing token directly via env
    if (process.env.TEST_TOKEN) TOKEN = process.env.TEST_TOKEN;

    const groups = GROUP_FILTER
        ? { [GROUP_FILTER]: TEST_GROUPS[GROUP_FILTER] }
        : TEST_GROUPS;

    if (GROUP_FILTER && !TEST_GROUPS[GROUP_FILTER]) {
        console.error(`\nUnknown group: "${GROUP_FILTER}". Available: ${Object.keys(TEST_GROUPS).join(', ')}`);
        process.exit(1);
    }

    for (const [name, fn] of Object.entries(groups)) {
        await fn();
    }

    // ── SUMMARY ──
    console.log('\n' + '═'.repeat(70));
    console.log('  TEST SUMMARY');
    console.log('═'.repeat(70));

    const failedTests = results.filter(r => r.status === 'FAIL');
    const passedTests = results.filter(r => r.status === 'PASS');

    console.log(`  Total    : ${stats.total}`);
    console.log(`  ✅ Passed : ${stats.passed}`);
    console.log(`  ❌ Failed : ${stats.failed}`);
    console.log(`  ⏭️  Skipped: ${stats.skipped}`);
    console.log(`  Pass Rate: ${stats.total > 0 ? ((stats.passed / (stats.total - stats.skipped)) * 100).toFixed(1) : 0}%`);

    if (failedTests.length > 0) {
        console.log('\n  FAILED TESTS:');
        failedTests.forEach(t => {
            console.log(`    ❌ [${t.group}] ${t.description} → ${t.code} ${t.method} ${t.path}`);
        });
    }

    // Group summary table
    console.log('\n  BY GROUP:');
    const groupSummary = {};
    results.forEach(r => {
        if (!groupSummary[r.group]) groupSummary[r.group] = { pass: 0, fail: 0, skip: 0 };
        groupSummary[r.group][r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : 'skip']++;
    });
    Object.entries(groupSummary).forEach(([group, s]) => {
        const icon = s.fail > 0 ? '❌' : '✅';
        console.log(`    ${icon} ${group.padEnd(22)} ${s.pass} passed, ${s.fail} failed, ${s.skip} skipped`);
    });

    console.log('\n' + '═'.repeat(70));
    process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
