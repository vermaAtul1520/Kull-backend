const { getBhajanService } = require("../services/bhajanService");
const { getCommunityService } = require("../services/communityService");

const bhajanService = getBhajanService();
const communityService = getCommunityService();

class CommunityBhajansController {

  // Create Bhajan (only SuperAdmin or CommunityAdmin)
  createBhajan = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const {
        title,
        artist,
        duration,
        views,
        youtubeUrl,
        thumbnailUrl,
        description,
        category,
      } = req.body;

      // Validate Community Exists
      const community = await communityService.getCommunityById(communityId);
      if (!community) return res.status(404).json({ success: false, message: "Community not found" });

      const bhajan = await bhajanService.createBhajan({
        title,
        artist,
        duration,
        views,
        youtubeUrl,
        thumbnailUrl,
        description,
        category,
      }, communityId, req.user.id);

      res.status(201).json({ success: true, data: bhajan });
    } catch (err) {
      next(err);
    }
  };

  // Fetch YouTube video info (No changes needed, external API)
  fetchYoutubeVideoInfo = async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "URL query parameter is required"
        });
      }

      // Extract video ID from YouTube URL
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[7].length === 11) ? match[7] : null;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Invalid YouTube URL"
        });
      }

      // Call YouTube Data API
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        // Fallback or error? Assuming configured.
        console.warn("YouTube API key not configured");
        // return res.status(500)... let's keep original logic
        if (!process.env.YOUTUBE_API_KEY) {
          return res.status(500).json({
            success: false,
            statusCode: 500,
            message: "YouTube API key not configured"
          });
        }
      }

      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "Video not found"
        });
      }

      const videoInfo = {
        title: data.items[0].snippet.title,
        description: data.items[0].snippet.description,
        thumbnails: {
          default: data.items[0].snippet.thumbnails.default?.url,
          medium: data.items[0].snippet.thumbnails.medium?.url,
          high: data.items[0].snippet.thumbnails.high?.url,
          standard: data.items[0].snippet.thumbnails.standard?.url,
          maxres: data.items[0].snippet.thumbnails.maxres?.url
        },
        channelTitle: data.items[0].snippet.channelTitle,
        publishedAt: data.items[0].snippet.publishedAt
      };

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: videoInfo
      });
    } catch (err) {
      console.error('Failed to extract YouTube video details:', err);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Failed to fetch YouTube video details",
        error: err.message
      });
    }
  };


  // Get all Bhajans for a Community
  getBhajansByCommunity = async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const options = { limit: limit, filters: {} };
      if (req.query.category) options.filters.category = req.query.category;

      const bhajans = await bhajanService.getBhajansByCommunity(communityId, options);

      res.status(200).json({ success: true, count: bhajans.length, data: bhajans });
    } catch (err) {
      next(err);
    }
  };

  // Get Bhajan by ID
  getBhajanById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const bhajan = await bhajanService.getBhajanById(id);
      if (!bhajan) return res.status(404).json({ success: false, message: "Bhajan not found" });

      // Populate community
      let communityData = bhajan.community;
      if (bhajan.communityId || bhajan.community) {
        const commId = bhajan.communityId || bhajan.community;
        const comm = await communityService.getCommunityById(commId);
        if (comm) {
          communityData = { _id: comm._id || comm.id, name: comm.name, code: comm.code };
        }
      }

      const populatedBhajan = { ...bhajan, community: communityData };

      res.status(200).json({ success: true, data: populatedBhajan });
    } catch (err) {
      next(err);
    }
  };

  // Update Bhajan
  updateBhajan = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role, roleInCommunity, community } = req.user;

      const bhajan = await bhajanService.getBhajanById(id);
      if (!bhajan) return res.status(404).json({ message: "Bhajan not found" });

      const isSuperAdmin = role === "superadmin";
      // Ensure community check works with ID comparison
      const bhajanCommId = String(bhajan.communityId || bhajan.community);
      const userCommId = community ? String(community._id || community.id || community) : null;

      const isCommunityAdminAndOwn = roleInCommunity === "admin" && bhajanCommId === userCommId;

      if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
        return res.status(403).json({ message: "Not authorized to update this Bhajan" });
      }

      const updated = await bhajanService.updateBhajan(id, req.body);

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Delete Bhajan
  deleteBhajan = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role, roleInCommunity, community } = req.user;

      const bhajan = await bhajanService.getBhajanById(id);
      if (!bhajan) return res.status(404).json({ message: "Bhajan not found" });

      const isSuperAdmin = role === "superadmin";
      const bhajanCommId = String(bhajan.communityId || bhajan.community);
      const userCommId = community ? String(community._id || community.id || community) : null;

      const isCommunityAdminAndOwn = roleInCommunity === "admin" && bhajanCommId === userCommId;

      if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
        return res.status(403).json({ message: "Not authorized to delete this Bhajan" });
      }

      await bhajanService.deleteBhajan(id);
      res.status(200).json({ success: true, message: "Bhajan deleted successfully" });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CommunityBhajansController();
