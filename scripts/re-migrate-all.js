#!/usr/bin/env node
const mongoose = require('mongoose');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

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
const BATCH_SIZE = 25;

const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

function cleanId(id) {
    return id ? id.toString() : null;
}

function toISO(date) {
    return date ? new Date(date).toISOString() : new Date().toISOString();
}

const transforms = {
    users: (doc) => {
        const cleanDocs = JSON.parse(JSON.stringify(doc));
        const id = cleanId(doc._id);
        const communityId = doc.community && doc.community._id ? cleanId(doc.community._id) : cleanId(doc.community);

        return {
            ...cleanDocs,
            id: id,
            email: doc.email || `no-email-${id}`,
            phone: doc.phone || `no-phone-${id}`,
            communityId: communityId || 'none',
            createdAt: toISO(doc.createdAt),
            updatedAt: toISO(doc.updatedAt)
        };
    },

    communities: (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        id: cleanId(doc._id),
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    }),

    'community-config': (doc) => {
        const config = doc.toObject ? doc.toObject() : doc;
        delete config._id;
        delete config.__v;
        const commId = cleanId(doc.community) || cleanId(doc._id);

        // Reorder drorOption
        if (config.drorOption) {
            const ORDERED_KEYS = [
                'occasions', 'kartavya', 'bhajan', 'games', 'citySearch',
                'organizationOfficer', 'education', 'employment', 'sports',
                'dukan', 'meetings', 'appeal', 'vote', 'familyTree'
            ];
            const reordered = {};
            ORDERED_KEYS.forEach(key => {
                if (config.drorOption[key]) {
                    reordered[key] = config.drorOption[key];
                }
            });
            Object.keys(config.drorOption).forEach(key => {
                if (!reordered[key]) reordered[key] = config.drorOption[key];
            });
            config.drorOption = reordered;
        }

        // Sanitize gotra
        if (config.gotra && Array.isArray(config.gotra)) {
            config.gotra = config.gotra.map(g => ({
                name: g.name || '',
                subgotra: Array.isArray(g.subgotra) ? g.subgotra.filter(s => s && typeof s === 'string') : []
            })).filter(g => g.name);
        } else {
            config.gotra = [];
        }

        const cleanConfig = JSON.parse(JSON.stringify(config));

        if (commId === '695792b9d4ad1bc7243a716b' || commId === '6958076de069d5262887256f') {
            console.log(`[DEBUG] Transforming Config for ${commId}. Gotra count: ${config.gotra ? config.gotra.length : 0}`);
        }

        return {
            ...cleanConfig,
            id: commId,
            communityId: commId,
            community: commId
        };
    },

    posts: (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        communityId: cleanId(doc.community),
        sk: `${toISO(doc.createdAt)}#${cleanId(doc._id)}`,
        id: cleanId(doc._id),
        authorId: cleanId(doc.author),
        likeCount: doc.likes ? doc.likes.length : 0,
        commentCount: doc.comments ? doc.comments.length : 0,
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    }),

    occasions: (doc) => {
        const id = cleanId(doc._id);
        return {
            ...JSON.parse(JSON.stringify(doc)),
            communityId: cleanId(doc.community),
            sk: `${toISO(doc.createdAt)}#${id}`,
            id: id,
            categoryId: cleanId(doc.category),
            category: cleanId(doc.category),
            createdBy: cleanId(doc.createdBy),
            createdAt: toISO(doc.createdAt),
            updatedAt: toISO(doc.updatedAt)
        };
    },

    'occasion-categories': (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        communityId: cleanId(doc.community),
        id: cleanId(doc._id),
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    }),

    'occasion-contents': (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        occasionId: cleanId(doc.occasion),
        id: cleanId(doc._id),
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    }),

    kartavya: (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        communityId: cleanId(doc.community),
        sk: `${toISO(doc.createdAt)}#${cleanId(doc._id)}`,
        id: cleanId(doc._id),
        createdBy: cleanId(doc.createdBy),
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    }),

    // Generic community entity (Donations, News, Appeals, etc.)
    generic: (doc) => ({
        ...JSON.parse(JSON.stringify(doc)),
        communityId: cleanId(doc.community),
        sk: `${toISO(doc.createdAt)}#${cleanId(doc._id)}`,
        id: cleanId(doc._id),
        createdAt: toISO(doc.createdAt),
        updatedAt: toISO(doc.updatedAt)
    })
};

// Map MongoDB entities to DynamoDB tables
const entities = [
    { name: 'users', model: User, table: 'users', transform: transforms.users },
    { name: 'communities', model: Community, table: 'communities', transform: transforms.communities },
    { name: 'community-config', model: CommunityConfiguration, table: 'community-config', transform: transforms['community-config'] },
    { name: 'posts', model: Post, table: 'posts', transform: transforms.posts },
    { name: 'donations', model: Donation, table: 'donations', transform: transforms.generic },
    { name: 'news', model: News, table: 'news', transform: transforms.generic },
    { name: 'occasions', model: Occasion, table: 'occasions', transform: transforms.occasions },
    { name: 'occasion-categories', model: OccasionCategory, table: 'occasion-categories', transform: transforms['occasion-categories'] },
    { name: 'occasion-contents', model: OccasionContent, table: 'occasion-contents', transform: transforms['occasion-contents'] },
    { name: 'appeals', model: Appeal, table: 'appeals', transform: transforms.generic },
    { name: 'dukaans', model: Dukaan, table: 'dukaans', transform: transforms.generic },
    { name: 'education', model: EducationResource, table: 'education', transform: transforms.generic },
    { name: 'job-posts', model: JobPost, table: 'jobs', transform: transforms.generic },
    { name: 'kartavya', model: Kartavya, table: 'kartavya', transform: transforms.kartavya },
    { name: 'meetings', model: Meeting, table: 'meetings', transform: transforms.generic },
    { name: 'sports-events', model: SportsEvent, table: 'sports', transform: transforms.generic },
    { name: 'bhajans', model: Bhajan, table: 'bhajans', transform: transforms.generic },
    {
        name: 'family', model: FamilyRelationship, table: 'family', transform: (doc) => ({
            ...JSON.parse(JSON.stringify(doc)),
            userId: cleanId(doc.user),
            relatedUserId: cleanId(doc.relatedUser),
            relationType: doc.relationType,
            createdAt: toISO(doc.createdAt)
        })
    },
    {
        name: 'likes', model: Like, table: 'likes', transform: (doc) => ({
            ...JSON.parse(JSON.stringify(doc)),
            postId: cleanId(doc.post),
            userId: cleanId(doc.user),
            createdAt: toISO(doc.createdAt)
        })
    },
    {
        name: 'comments', model: Comment, table: 'comments', transform: (doc) => ({
            ...JSON.parse(JSON.stringify(doc)),
            postId: cleanId(doc.post),
            sk: `${toISO(doc.createdAt)}#${cleanId(doc._id)}`,
            id: cleanId(doc._id),
            author: cleanId(doc.author),
            content: doc.content,
            parentComment: cleanId(doc.parentComment),
            createdAt: toISO(doc.createdAt)
        })
    }
];

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    for (const entity of entities) {
        console.log(`\n--- Migrating ${entity.name} ---`);
        let docs;
        if (entity.name === 'users') {
            docs = await entity.model.find({}).select('+password +plainTextPassword').lean();
        } else {
            docs = await entity.model.find({}).lean();
        }
        console.log(`Found ${docs.length} documents.`);

        if (docs.length === 0) continue;

        const items = docs.map(doc => {
            const item = entity.transform(doc);
            // Clean up any internal MongoDB fields that might have leaked into generic
            if (item._id) delete item._id;
            if (item.__v !== undefined) delete item.__v;
            if (item.community && entity.table !== 'community-config') {
                // Normal entities should use communityId for PK, but we keep community for app logic
                item.community = cleanId(item.community);
            }
            return item;
        });

        const fullTableName = `${TABLE_PREFIX}${entity.table}`;

        // Batch write
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const chunk = items.slice(i, i + BATCH_SIZE);
            const params = {
                RequestItems: {
                    [fullTableName]: chunk.map(item => ({
                        PutRequest: { Item: item }
                    }))
                }
            };

            try {
                await docClient.send(new BatchWriteCommand(params));
                process.stdout.write('.');
            } catch (err) {
                console.error(`\nError writing batch to ${fullTableName}:`, err.message);
                // Fallback to individual puts for debugging the bad batch
                for (const badItem of chunk) {
                    try {
                        await docClient.send(new PutCommand({ TableName: fullTableName, Item: badItem }));
                    } catch (innerErr) {
                        console.error(`\nFailed item in ${fullTableName}:`, JSON.stringify(badItem));
                        console.error(innerErr.message);
                    }
                }
            }
        }
        console.log(`\n✓ ${entity.name} migrated to ${fullTableName}`);
    }

    await mongoose.disconnect();
    console.log('\nAll migrations completed.');
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
