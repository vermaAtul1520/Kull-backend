#!/usr/bin/env node
// scripts/migrate-to-dynamodb.js
// Data Migration Script: MongoDB to DynamoDB
// Usage: node scripts/migrate-to-dynamodb.js [--dry-run] [--entity=users]

require('dotenv').config();
const mongoose = require('mongoose');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

// MongoDB Models
const User = require('../models/User');
const { Community, CommunityConfiguration } = require('../models/Community');
const Post = require('../models/Post');
const Donation = require('../models/Donation');
const News = require('../models/News');
const { Occasion, OccasionCategory, OccasionContent } = require('../models/Occasion');
const Appeal = require('../models/Appeal');
const Dukaan = require('../models/Dukaan');
const EducationResource = require('../models/EducationResource');
const JobPost = require('../models/JobPost');
const Kartavya = require('../models/Kartavya');
const Meeting = require('../models/Meeting');
const SportsEvent = require('../models/SportsEvent');
const FamilyRelationship = require('../models/FamilyRelationship');
const Bhajan = require('../models/Bhajan');
const Like = require('../models/Like');
const Comment = require('../models/Comment');

// Configuration
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'kull-prod-';
const REGION = process.env.AWS_DYNAMODB_REGION || 'ap-south-1';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT; // Optional for local
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const entityArg = args.find(a => a.startsWith('--entity='));
const specificEntity = entityArg ? entityArg.split('=')[1] : null;

// Helper to convert ObjectIds to strings
function cleanObjectIds(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj.toString && obj._bsontype === 'ObjectId') return obj.toString();
    if (Array.isArray(obj)) return obj.map(cleanObjectIds);

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === '__v') continue; // Skip mongoose version key
        if (value && value._bsontype === 'ObjectId') {
            cleaned[key] = value.toString();
        } else if (value instanceof Date) {
            cleaned[key] = value.toISOString();
        } else if (Array.isArray(value)) {
            cleaned[key] = value.map(cleanObjectIds);
        } else if (value !== null && typeof value === 'object') {
            cleaned[key] = cleanObjectIds(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
    region: REGION,
    ...(ENDPOINT && { endpoint: ENDPOINT }),
});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true,
        convertClassInstanceToMap: true
    },
});

// Entity configurations - table names must match create-dynamodb-tables.js
const entities = [
    { name: 'users', model: User, tableName: `${TABLE_PREFIX}users`, transform: transformUser, select: '+password' },
    { name: 'communities', model: Community, tableName: `${TABLE_PREFIX}communities`, transform: transformCommunity },
    { name: 'community-configs', model: CommunityConfiguration, tableName: `${TABLE_PREFIX}community-config`, transform: transformCommunityConfig },
    { name: 'posts', model: Post, tableName: `${TABLE_PREFIX}posts`, transform: transformPost },
    { name: 'donations', model: Donation, tableName: `${TABLE_PREFIX}donations`, transform: transformCommunityEntity },
    { name: 'news', model: News, tableName: `${TABLE_PREFIX}news`, transform: transformCommunityEntity },
    { name: 'occasions', model: Occasion, tableName: `${TABLE_PREFIX}occasions`, transform: transformCommunityEntity },
    { name: 'occasion-categories', model: OccasionCategory, tableName: `${TABLE_PREFIX}occasion-categories`, transform: transformCommunityEntity },
    { name: 'appeals', model: Appeal, tableName: `${TABLE_PREFIX}appeals`, transform: transformCommunityEntity },
    { name: 'dukaans', model: Dukaan, tableName: `${TABLE_PREFIX}dukaans`, transform: transformCommunityEntity },
    { name: 'education', model: EducationResource, tableName: `${TABLE_PREFIX}education`, transform: transformCommunityEntity },
    { name: 'job-posts', model: JobPost, tableName: `${TABLE_PREFIX}jobs`, transform: transformCommunityEntity },
    { name: 'kartavya', model: Kartavya, tableName: `${TABLE_PREFIX}kartavya`, transform: transformCommunityEntity },
    { name: 'meetings', model: Meeting, tableName: `${TABLE_PREFIX}meetings`, transform: transformCommunityEntity },
    { name: 'sports-events', model: SportsEvent, tableName: `${TABLE_PREFIX}sports`, transform: transformCommunityEntity },
    { name: 'family', model: FamilyRelationship, tableName: `${TABLE_PREFIX}family`, transform: transformFamily },
    { name: 'bhajans', model: Bhajan, tableName: `${TABLE_PREFIX}bhajans`, transform: transformCommunityEntity },
    { name: 'likes', model: Like, tableName: `${TABLE_PREFIX}likes`, transform: transformLike },
    { name: 'comments', model: Comment, tableName: `${TABLE_PREFIX}comments`, transform: transformComment },
];

// Transform functions
function transformUser(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const commId = obj.community?.toString() || 'none';
    return {
        id: obj._id.toString(),
        sk: `${new Date(obj.createdAt).toISOString()}#${obj._id.toString()}`,
        email: obj.email || `no-email-${obj._id.toString()}`,
        phone: obj.phone || `no-phone-${obj._id.toString()}`,
        firstName: obj.firstName,
        lastName: obj.lastName,
        code: obj.code || `code-${obj._id.toString()}`,
        role: obj.role || 'user',
        community: commId,
        communityId: commId, // Required for GSI
        communityStatus: obj.communityStatus || 'pending',
        roleInCommunity: obj.roleInCommunity || 'member',
        status: obj.status || true,
        password: obj.password,
        profileImage: obj.profileImage || null,
        gender: obj.gender || null,
        occupation: obj.occupation || null,
        religion: obj.religion || null,
        cast: obj.cast || null,
        gotra: obj.gotra || null,
        subGotra: obj.subGotra || null,
        fatherName: obj.fatherName || null,
        address: obj.address || null,
        pinCode: obj.pinCode || null,
        maritalStatus: obj.maritalStatus || null,
        dateOfBirth: obj.dateOfBirth?.toISOString() || null,
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: obj.updatedAt?.toISOString() || new Date().toISOString(),
    };
}

function transformCommunity(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
        id: obj._id.toString(),
        sk: `${new Date(obj.createdAt).toISOString()}#${obj._id.toString()}`,
        name: obj.name,
        code: obj.code,
        description: obj.description || null,
        logo: obj.logo || null,
        createdBy: obj.createdBy?.toString() || null,
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: obj.updatedAt?.toISOString() || new Date().toISOString(),
    };
}

function transformCommunityConfig(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const cleaned = cleanObjectIds(obj);
    const commId = obj.community?.toString() || obj._id.toString();

    // Apply defaults (since .lean() bypasses Mongoose defaults)
    const defaults = {
        drorOption: {
            occasions: { visible: true, label: "Occasions", labelHindi: "अवसर" },
            kartavya: { visible: true, label: "Kartavya", labelHindi: "कर्तव्य" },
            bhajan: { visible: true, label: "Bhajan", labelHindi: "भजन" },
            games: { visible: true, label: "Games", labelHindi: "खेल" },
            citySearch: { visible: true, label: "City Search", labelHindi: "शहर खोज" },
            organizationOfficer: { visible: true, label: "Organization Officer", labelHindi: "संगठन अधिकारी" },
            education: { visible: true, label: "Education", labelHindi: "शिक्षा" },
            employment: { visible: true, label: "Employment", labelHindi: "रोजगार" },
            sports: { visible: true, label: "Sports", labelHindi: "खेल-कूद" },
            dukan: { visible: true, label: "Dukan", labelHindi: "दुकान" },
            meetings: { visible: true, label: "Meetings", labelHindi: "बैठकें" },
            appeal: { visible: true, label: "Appeal", labelHindi: "अपील" },
            vote: { visible: true, label: "Vote", labelHindi: "मतदान" },
            family: { visible: true, label: "Family Tree", labelHindi: "वंश वृक्ष" },
            familyTree: { visible: true, label: "Family Tree", labelHindi: "वंश वृक्ष" }
        },
        banner: [],
        smaajKeTaaj: [],
        gotra: []
    };

    return {
        communityId: commId, // Required for PK
        community: commId,   // Required for App
        ...defaults,         // Apply defaults first
        ...cleaned,          // Overwrite with actual data
        _id: undefined,
        __v: undefined,
    };
}

function transformPost(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const commId = obj.community.toString();
    const authId = obj.author.toString();
    return {
        communityId: commId, // Required for PK
        community: commId,   // Required for App
        sk: `${new Date(obj.createdAt).toISOString()}#${obj._id.toString()}`,
        id: obj._id.toString(),
        authorId: authId, // Required for GSI
        author: authId,   // Required for App
        title: obj.title,
        content: obj.content,
        imageUrl: obj.imageUrl || null,
        isActive: obj.isActive !== false,
        likeCount: obj.likes?.length || 0,
        commentCount: obj.comments?.length || 0,
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: obj.updatedAt?.toISOString() || new Date().toISOString(),
    };
}

function transformCommunityEntity(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const id = obj._id.toString();
    const createdAt = obj.createdAt?.toISOString() || new Date().toISOString();

    // Determine community ID (handle various source fields)
    const comId = obj.community?.toString() || obj.communityId?.toString() || 'global';

    // Clean all ObjectIds and dates
    const cleaned = cleanObjectIds(obj);

    return {
        communityId: comId, // Required for PK
        community: comId,   // Required for App
        sk: `${createdAt}#${id}`,
        id,
        ...cleaned,
        _id: undefined,
        __v: undefined,
        createdAt,
        updatedAt: obj.updatedAt?.toISOString() || new Date().toISOString(),
    };
}

function transformFamily(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const uId = obj.user.toString();
    const rId = obj.relatedUser.toString();
    return {
        userId: uId,        // Required for PK
        user: uId,          // Required for App
        relatedUserId: rId, // Required for SK
        relatedUser: rId,   // Required for App
        relationType: obj.relationType,
        createdBy: obj.createdBy?.toString() || null,
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
    };
}

function transformLike(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const pId = obj.post.toString();
    const uId = obj.user.toString();
    return {
        postId: pId, // Required for PK
        post: pId,   // Required for App
        sk: uId,
        userId: uId, // Required for SK
        user: uId,   // Required for App
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
    };
}

function transformComment(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    const pId = obj.post.toString();
    return {
        postId: pId, // Required for PK
        post: pId,   // Required for App
        sk: `${obj.createdAt?.toISOString() || new Date().toISOString()}#${obj._id.toString()}`,
        id: obj._id.toString(),
        author: obj.author.toString(),
        content: obj.content,
        parentComment: obj.parentComment?.toString() || null,
        isDeleted: obj.isDeleted || false,
        createdAt: obj.createdAt?.toISOString() || new Date().toISOString(),
    };
}

// Batch write to DynamoDB
async function batchWrite(tableName, items) {
    if (isDryRun) {
        console.log(`  [DRY RUN] Would write ${items.length} items to ${tableName}`);
        return;
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const putRequests = batch.map(item => ({
            PutRequest: { Item: item }
        }));

        try {
            await docClient.send(new BatchWriteCommand({
                RequestItems: { [tableName]: putRequests }
            }));
            console.log(`  Wrote batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);
        } catch (error) {
            console.error(`  Error writing batch to ${tableName}:`, error.message);
            throw error;
        }
    }
}

// Migrate single entity
async function migrateEntity(entity) {
    console.log(`\nMigrating: ${entity.name}`);

    try {
        let query = entity.model.find({});
        if (entity.select) {
            query = query.select(entity.select);
        }
        const docs = await query.lean();
        console.log(`  Found ${docs.length} documents in MongoDB`);

        if (docs.length === 0) {
            console.log(`  Skipping - no documents to migrate`);
            return { name: entity.name, count: 0, status: 'skipped' };
        }

        const items = docs.map(doc => entity.transform(doc));
        console.log(`  Transformed ${items.length} items for DynamoDB`);

        await batchWrite(entity.tableName, items);

        console.log(`  ✓ Successfully migrated ${items.length} ${entity.name}`);
        return { name: entity.name, count: items.length, status: 'success' };
    } catch (error) {
        console.error(`  ✗ Failed to migrate ${entity.name}:`, error.message);
        return { name: entity.name, count: 0, status: 'failed', error: error.message };
    }
}

// Main migration function
async function migrate() {
    console.log('='.repeat(60));
    console.log('KULL Backend - MongoDB to DynamoDB Migration');
    console.log('='.repeat(60));
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
    console.log(`Target: ${specificEntity || 'All entities'}`);
    console.log(`DynamoDB Region: ${REGION}`);
    console.log(`Table Prefix: ${TABLE_PREFIX}`);
    if (ENDPOINT) console.log(`Endpoint: ${ENDPOINT}`);
    console.log('='.repeat(60));

    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }

    // Filter entities if specific one requested
    const entitiesToMigrate = specificEntity
        ? entities.filter(e => e.name === specificEntity)
        : entities;

    if (specificEntity && entitiesToMigrate.length === 0) {
        console.error(`Entity "${specificEntity}" not found. Available: ${entities.map(e => e.name).join(', ')}`);
        process.exit(1);
    }

    // Run migrations
    const results = [];
    for (const entity of entitiesToMigrate) {
        const result = await migrateEntity(entity);
        results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');
    const totalRecords = successful.reduce((sum, r) => sum + r.count, 0);

    console.log(`Total entities: ${results.length}`);
    console.log(`Successful: ${successful.length} (${totalRecords} records)`);
    console.log(`Skipped: ${skipped.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\nFailed entities:');
        failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }

    if (isDryRun) {
        console.log('\n[DRY RUN] No changes were made. Run without --dry-run to migrate data.');
    }

    // Cleanup
    await mongoose.disconnect();
    console.log('\n✓ Migration complete');
    process.exit(failed.length > 0 ? 1 : 0);
}

// Run migration
migrate().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
