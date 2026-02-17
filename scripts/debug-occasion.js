const { getOccasionRepository } = require('./repositories/occasionRepository');
const { getOccasionCategoryRepository } = require('./repositories/occasionCategoryRepository');
const { getOccasionContentRepository } = require('./repositories/occasionContentRepository');
require('dotenv').config();

async function debug() {
    const occasionRepo = getOccasionRepository();
    const categoryRepo = getOccasionCategoryRepository();
    const contentRepo = getOccasionContentRepository();

    const occasionId = "697a4dce23ebd976049a915c";
    console.log(`--- Fetching Occasion: ${occasionId} ---`);

    // 1. Raw from DB
    const raw = await occasionRepo.getDb().getItem(occasionRepo.tableName, {
        communityId: "6958076de069d5262887256f",
        sk: "2026-01-28T17:56:30.244Z#697a4dce23ebd976049a915c"
    });
    console.log("Raw Occasion:", JSON.stringify(raw, null, 2));

    // 2. Transformed
    const transformed = await occasionRepo.findById(occasionId);
    console.log("Transformed Occasion:", JSON.stringify(transformed, null, 2));

    // 3. Category
    const catId = transformed.categoryId || transformed.category;
    console.log(`--- Fetching Category: ${catId} ---`);
    const cat = await categoryRepo.findById(catId);
    console.log("Category:", JSON.stringify(cat, null, 2));

    // 4. Contents
    console.log(`--- Fetching Contents for: ${occasionId} ---`);
    const contents = await contentRepo.findByOccasion(occasionId);
    console.log("Contents:", JSON.stringify(contents, null, 2));
}

debug().catch(console.error);
