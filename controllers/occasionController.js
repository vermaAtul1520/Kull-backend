const {Occasion, OccasionContent} = require("../models/Occasion");
const BaseController = require("../utils/baseController");

class OccasionController extends BaseController {
  constructor() {
    super(Occasion);
  }

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
      const { category, gender, gotra, subGotra } = req.body;
      if (!category) {
        return res.status(400).json({ success: false, message: "Category is required" });
      }

      const occasion = await this.model.create({
        ...req.body,
        category,
        gender: gender || "not specified",
        gotra: gotra || null,
        subGotra: subGotra || null,
      });

      res.status(201).json({ success: true, data: occasion });
    } catch (err) {
      next(err);
    }
  };

  // Get all Occasions
  getAllOccasions = async (req, res, next) => {
    try {
      // Filter based on user role and community
      if (req.user.isSuperAdmin) {
        // Super admin can see all, but filter by community if provided
        if (req.query.community) {
          req.parsedQuery.filter = {
            ...req.parsedQuery.filter,
            community: req.query.community,
          };
        }
      } else {
        // Community admin and normal users see only their community's occasions
        req.parsedQuery.filter = {
          ...req.parsedQuery.filter,
          community: req.user.community,
        };
      }

      return this.getAll(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Get single Occasion
  getOccasion = (req, res, next) => {
    try {
      return this.getOne(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Update Occasion
  updateOccasion = async (req, res, next) => {
    try {
      const occasion = await this.model.findById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      if (!req.user.isSuperAdmin && occasion.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update Occasion outside your community",
        });
      }

      // Only allow updating allowed fields
      const allowedUpdates = ["title", "occasionType", "category", "gender", "gotra", "subGotra"];
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) occasion[field] = req.body[field];
      });

      await occasion.save();
      res.status(200).json({ success: true, data: occasion });
    } catch (err) {
      next(err);
    }
  };

  // Delete Occasion
  deleteOccasion = async (req, res, next) => {
    try {
      const occasion = await this.model.findById(req.params.id);
      if (!occasion) {
        return res.status(404).json({ success: false, message: "Occasion not found" });
      }

      if (!req.user.isSuperAdmin && occasion.community.toString() !== req.user.community.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete Occasion outside your community",
        });
      }

      await occasion.deleteOne();
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
      const contentDocs = [];

      // Loop through all combinations: category × gender × gotra × subGotra
      for (const category of categories) {
        for (const gender of genders) {
          for (const gotraObj of gotras) {
            // If no subGotras, still create one record with empty string
            const subGotrasArray = Array.isArray(gotraObj.subGotras) && gotraObj.subGotras.length > 0
              ? gotraObj.subGotras
              : [""];

            for (const subGotra of subGotrasArray) {
              // Generate unique request code for this combination
              // const reqCode = `${occasionType
              //   .toLowerCase()
              //   .replace(/[^a-z0-9]+/g, "-")}-${category.toString().slice(-4)}-${gender}-${gotraObj.name.toLowerCase()}-${subGotra.toLowerCase()}-${uuidv4().split("-")[0]}`;

              const occasionData = {
                occasionType,
                category,
                gender,
                gotra: gotraObj.name,
                subGotra,
                community,
                createdBy,
                // reqCode, // unique code
              };

              const occasion = await this.model.create(occasionData);
              createdOccasions.push(occasion);

              // Attach contents
              if (contents && Array.isArray(contents)) {
                for (const content of contents) {
                  contentDocs.push({
                    occasion: occasion._id,
                    type: content.type,
                    url: content.url,
                    thumbnailUrl: content.thumbnailUrl,
                    language: content.language,
                  });
                }
              }
            }
          }
        }
      }

      // Bulk insert contents
      if (contentDocs.length > 0) {
        const createdContents = await OccasionContent.insertMany(contentDocs);

        // Link contents to occasions
        for (const occasion of createdOccasions) {
          const linkedContents = createdContents.filter(c => c.occasion.toString() === occasion._id.toString());
          occasion.contents = linkedContents.map(c => c._id);
          await occasion.save();
        }
      }

      res.status(201).json({ success: true, message: `${createdOccasions.length} occasions created successfully` });
    } catch (err) {
      next(err);
    }
  };


}

module.exports = new OccasionController();
