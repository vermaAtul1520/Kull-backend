// controllers/occasionController.js
// Refactored to use OccasionService

const { getOccasionService } = require("../services/occasionService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const occasionService = getOccasionService();
const communityService = getCommunityService();
const userService = getUserService();

class OccasionController {

  // Create Occasion
  createOccasion = async (req, res, next) => {
    try {
      // Super admin must provide community
      if (req.user.isSuperAdmin) {
        if (!req.body.community) {
          return res.status(400).json({
            success: false,
            message: "Community is required when creating Occasion as super admin",
          });
        }
        req.body.createdBy = req.body.createdBy || req.user.id;
      } else {
        req.body.community = req.user.community;
        req.body.createdBy = req.user.id;
      }

      // Optional fields: gender, gotra, subGotra
      const { category, gender, gotra, subGotra, contents } = req.body;
      if (!category) {
        return res.status(400).json({ success: false, message: "Category is required" });
      }

      // Create occasion without contents
      const occasionData = {
        occasionType: req.body.occasionType,
        category,
        gender: gender || "not specified",
        gotra: gotra || null,
        subGotra: subGotra || null,
      };

      // Since createOccasion expects data, communityId, createdBy
      // We pass req.body.community as separate arg
      const occasion = await occasionService.createOccasion(occasionData, req.body.community, req.body.createdBy);

      // Create contents if provided
      let createdContents = [];
      if (contents && Array.isArray(contents) && contents.length > 0) {
        // Map content fields to match what repo expects
        // content: { type, url, thumbnailUrl, language }
        createdContents = await occasionService.addContents(contents, occasion.id || occasion._id);
      }

      // Populate category and contents before returning
      // Manual population
      // Category is just ID in occasion. Assuming we need details or just ID is fine?
      // Original code did populate('category').
      // Let's fetch category.
      let categoryData = occasion.category || occasion.categoryId;
      if (categoryData) {
        // We need getCategoryById? Service has getCategoriesByCommunity but maybe direct ID access?
        // OccasionService doesn't expose findCategoryById.
        // We can use occasionService.occasionCategoryRepo.findById
        const cat = await occasionService.occasionCategoryRepo.findById(categoryData);
        if (cat) categoryData = cat;
      }

      const populatedOccasion = {
        ...occasion,
        category: categoryData,
        contents: createdContents
      };

      res.status(201).json({ success: true, data: populatedOccasion });
    } catch (err) {
      next(err);
    }
  };

  // Get all Occasions
  getAllOccasions = async (req, res, next) => {
    try {
      // Filter based on user role and community
      let communityId = null;

      // Extract filters
      const {
        occasionType, category, categoryId, gotra, subGotra, gender, isFeatured
      } = req.query;

      const filters = {};
      if (occasionType && occasionType !== 'undefined') filters.occasionType = occasionType;

      // Handle both category and categoryId naming
      const finalCategoryId = categoryId || category;
      if (finalCategoryId && finalCategoryId !== 'undefined') filters.categoryId = finalCategoryId;

      if (gotra && gotra !== 'undefined') filters.gotra = gotra;
      if (subGotra && subGotra !== 'undefined') filters.subGotra = subGotra;
      if (gender && gender !== 'undefined') filters.gender = gender;
      if (req.query.isFeatured !== undefined) filters.isFeatured = req.query.isFeatured === 'true';

      let docs = [];
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      let total = 0;

      if (req.user.isSuperAdmin && !req.user.isCommunityAdmin) {
        const { community } = req.query;
        const userCommId = (req.user.community?._id || req.user.community?.id || req.user.community)?.toString();
        const targetCommunity = community || userCommId;

        if (targetCommunity) {
          // Super admin querying a specific community
          communityId = targetCommunity;
          docs = await occasionService.getOccasionsByCommunity(communityId, { limit, skip, filters });
          total = await occasionService.occasionRepo.countByCommunity(communityId, filters);
        } else {
          // No community specified even for superadmin, return empty to prevent global scan
          docs = [];
          total = 0;
        }
      } else {
        // Community admin or regular user
        const userCommunity = req.user.community;
        if (!userCommunity) {
          return res.status(403).json({ success: false, message: "Community access required" });
        }
        communityId = userCommunity._id || userCommunity.id || userCommunity;
        communityId = String(communityId); // Ensure it's a string for comparison/service calls

        docs = await occasionService.getOccasionsByCommunity(communityId, { limit, skip, filters });
        total = await occasionService.occasionRepo.countByCommunity(communityId, filters);
      }

      // Manual populate
      // This is N+1 but necessary without JOINs. 
      // Optimized: Fetch all categories and contents in bulk if possible, or just N+1 for now.

      // 1. Collect all community and user IDs for batch population
      const communityIds = [...new Set(docs.map(doc => String(doc.communityId || doc.community || '')))].filter(id => id && id.length > 5);
      const userIds = [...new Set(docs.map(doc => String(doc.createdBy || '')))].filter(id => id && id.length > 5);

      const [communities, users] = await Promise.all([
        communityService.getManyCommunitiesByIds(communityIds),
        userService.getManyByIds(userIds)
      ]);

      const communityMap = communities.reduce((acc, c) => ({ ...acc, [String(c.id || c._id)]: c }), {});
      const userMap = users.reduce((acc, u) => ({ ...acc, [String(u.id || u._id)]: u }), {});

      const populatedDocs = await Promise.all(docs.map(async (doc) => {
        const d = doc.toObject ? doc.toObject() : { ...doc };

        // 1. Identify Category ID
        // It might be in categoryId or category field (sometimes as a string, sometimes as an object/array)
        let catId = d.categoryId;
        if (!catId || typeof catId !== 'string') {
          if (typeof d.category === 'string') {
            catId = d.category;
          } else if (d.category && typeof d.category === 'object') {
            catId = d.category.id || d.category._id || d.category.categoryId;
            // Handle if category is an array (legacy migration anomaly)
            if (!catId && Array.isArray(d.category) && d.category.length > 0) {
              catId = d.category[0].id || d.category[0];
            }
          }
        }

        // 2. Populate Category
        if (catId && typeof catId === 'string' && catId.length > 5) {
          try {
            const cat = await occasionService.occasionCategoryRepo.findById(catId);
            if (cat) {
              d.category = cat;
              d.categoryId = catId;
            }
          } catch (e) {
            console.error(`Error populating category ${catId}:`, e.message);
          }
        }

        // 3. Populate Community
        const commId = String(d.communityId || d.community || '');
        if (communityMap[commId]) {
          d.community = {
            _id: communityMap[commId].id || communityMap[commId]._id,
            name: communityMap[commId].name
          };
        }

        // 4. Populate createdBy
        const creatorIdStr = String(d.createdBy || '');
        if (userMap[creatorIdStr]) {
          d.createdBy = {
            _id: userMap[creatorIdStr].id || userMap[creatorIdStr]._id,
            firstName: userMap[creatorIdStr].firstName,
            lastName: userMap[creatorIdStr].lastName
          };
        }

        // 5. Populate Contents
        const occasionId = d.id || d._id;
        if (occasionId) {
          try {
            // Priority 1: Fetch from separate table (the correct way)
            let contents = await occasionService.getContentsByOccasion(occasionId);

            // Priority 2: Rescue if they were mistakenly stored in category property (migration anomaly seen in UI)
            if ((!contents || contents.length === 0) && d.category && typeof d.category === 'object') {
              const entries = Object.entries(d.category);
              const foundContents = entries
                .filter(([key, val]) => !isNaN(key) && val && typeof val === 'object' && val.url)
                .map(([key, val]) => val);

              if (foundContents.length > 0) {
                contents = foundContents;
                // Cleanup contaminated category object
                foundContents.forEach((_, i) => delete d.category[i]);
              }
            }

            // Priority 3: Fallback if already an array of objects in the doc
            if ((!contents || contents.length === 0) && Array.isArray(d.contents) && d.contents.length > 0) {
              if (typeof d.contents[0] === 'object') {
                contents = d.contents;
              }
            }

            d.contents = contents || [];
          } catch (e) {
            console.error(`Error fetching contents for occasion ${occasionId}:`, e.message);
            d.contents = [];
          }
        } else {
          d.contents = [];
        }

        return d;
      }));

      return res.status(200).json({
        success: true,
        total,
        page,
        limit,
        count: populatedDocs.length,
        data: populatedDocs
      });
    } catch (err) {
      next(err);
    }
  };

  // Get single Occasion
  getOccasion = async (req, res, next) => {
    try {
      const doc = await occasionService.getOccasionById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });

      const d = doc.toObject ? doc.toObject() : { ...doc };

      // Category
      if (d.categoryId || d.category) {
        const cat = await occasionService.occasionCategoryRepo.findById(d.categoryId || d.category);
        d.category = cat || d.category;
      }

      // Contents
      const contents = await occasionService.getContentsByOccasion(d.id || d._id);
      d.contents = contents;

      res.status(200).json({ success: true, data: d });
    } catch (err) {
      next(err);
    }
  };

  // Update Occasion
  updateOccasion = async (req, res, next) => {
    try {
      const occasion = await occasionService.getOccasionById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      // Check Permissions
      const occasionCommId = occasion.communityId || occasion.community;
      const userCommId = req.user.community ? (req.user.community._id || req.user.community) : null;

      if (!req.user.isSuperAdmin && String(occasionCommId) !== String(userCommId)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update Occasion outside your community",
        });
      }

      // Only allow updating allowed fields
      const allowedUpdates = ["title", "occasionType", "category", "gender", "gotra", "subGotra"];
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const updated = await occasionService.updateOccasion(req.params.id, updates);

      // Populate for response
      const d = { ...updated };
      if (d.categoryId || d.category) {
        const cat = await occasionService.occasionCategoryRepo.findById(d.categoryId || d.category);
        d.category = cat || d.category;
      }
      const contents = await occasionService.getContentsByOccasion(d.id || d._id);
      d.contents = contents;

      res.status(200).json({ success: true, data: d });
    } catch (err) {
      next(err);
    }
  };

  // Delete Occasion
  deleteOccasion = async (req, res, next) => {
    try {
      const occasion = await occasionService.getOccasionById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      const occasionCommId = occasion.communityId || occasion.community;
      const userCommId = req.user.community ? (req.user.community._id || req.user.community) : null;

      if (!req.user.isSuperAdmin && String(occasionCommId) !== String(userCommId)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete Occasion outside your community",
        });
      }

      await occasionService.deleteOccasion(req.params.id);
      res.status(200).json({ success: true, message: "Occasion deleted successfully" });
    } catch (err) {
      next(err);
    }
  };

  bulkUploadOccasions = async (req, res, next) => {
    try {
      const { occasionType, categories, genders, gotras, community, createdBy, contents } = req.body;

      if (!occasionType || !Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ success: false, message: "Occasion type and categories are required" });
      }

      if (!Array.isArray(genders) || genders.length === 0) {
        return res.status(400).json({ success: false, message: "At least one gender is required" });
      }

      if (!Array.isArray(gotras) || gotras.length === 0) {
        return res.status(400).json({ success: false, message: "At least one gotra is required" });
      }

      const createdOccasions = [];

      // Loop through all combinations: category × gender × gotra × subGotra
      for (const category of categories) {
        for (const gender of genders) {
          for (const gotraObj of gotras) {
            // If no subGotras, still create one record with empty string
            const subGotrasArray = Array.isArray(gotraObj.subGotras) && gotraObj.subGotras.length > 0
              ? gotraObj.subGotras
              : [""];

            for (const subGotra of subGotrasArray) {
              const occasionData = {
                occasionType,
                category,
                gender,
                gotra: gotraObj.name,
                subGotra,
              };

              const occasion = await occasionService.createOccasion(occasionData, community, createdBy);
              createdOccasions.push(occasion);

              // Attach contents
              if (contents && Array.isArray(contents)) {
                await occasionService.addContents(contents, occasion.id || occasion._id);
              }
            }
          }
        }
      }

      // Note: original code did bulk insert of contents at the end. 
      // Here we did it inside loop for simplicity with service. 
      // If performance is concern, we could collect all content docs and insertMany at once, 
      // but `occasionService.addContents` handles items for one occasion.
      // Given DynamoDB batch limits, doing it per occasion is safer for now.

      res.status(201).json({ success: true, message: `${createdOccasions.length} occasions created successfully` });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new OccasionController();
