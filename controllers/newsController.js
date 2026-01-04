const News = require("../models/News");

// Create News for a specific community
exports.createNews = async (req, res, next) => {
  try {
    const { title, content, category, tags, imageUrl } = req.body;
    const { communityId } = req.params;
    const { role, roleInCommunity, community } = req.user;

    // Authorization: Community admin can only create for their community
    if (role !== 'superadmin' && community._id.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create news for your own community"
      });
    }
   
    const news = new News({
      title,
      content,
      category,
      tags,
      community: communityId,
      imageUrl,
      author: req.user.id
    });

    await news.save();
    return res.status(201).json({ 
      success: true, 
      statusCode: 201,
      message: "News created successfully",
      data: news 
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error creating news",
      error: err.message
    });
  }
};

// Update News
exports.updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        statusCode: 404,
        message: "News not found" 
      });
    }

    // Authorization: Community admin can only update their community's news
    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && news.community.toString() === community._id.toString();

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only update news from your own community"
      });
    }

    Object.assign(news, req.body);
    await news.save();

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      message: "News updated successfully",
      data: news 
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error updating news",
      error: err.message
    });
  }
};

// Delete News
exports.deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        statusCode: 404,
        message: "News not found" 
      });
    }

    // Authorization: Community admin can only delete their community's news
    const isSuperAdmin = role === 'superadmin';
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && news.community.toString() === community._id.toString();

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only delete news from your own community"
      });
    }

    await news.deleteOne();
    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      message: "News deleted successfully" 
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error deleting news",
      error: err.message
    });
  }
};

// Get news by community ID
exports.getCommunityNews = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { role, roleInCommunity, community } = req.user;

    // Authorization: Non-superadmin users can only view their community's news
    if (role !== 'superadmin' && community._id.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    const newsList = await News.find({ community: communityId })
      .populate("author", "firstName lastName email")
      .populate("community", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      data: newsList 
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching news",
      error: err.message
    });
  }
};

// Get single news by ID
exports.getSingleNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const news = await News.findById(id)
      .populate("author", "firstName lastName email")
      .populate("community", "name");

    if (!news) {
      return res.status(404).json({ 
        success: false, 
        statusCode: 404,
        message: "News not found" 
      });
    }

    // Authorization: Non-superadmin users can only view their community's news
    if (role !== 'superadmin' && news.community._id.toString() !== community._id.toString()) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      data: news 
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching news",
      error: err.message
    });
  }
};

// Get news headlines for homepage slider (Issue #18 fix)
exports.getNewsHeadlines = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { role, roleInCommunity, community } = req.user;
    const limit = parseInt(req.query.limit) || 5;

    // Authorization: Non-superadmin users can only view their community's news
    if (role !== 'superadmin' && community._id.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    const headlines = await News.find({ community: communityId })
      .select('title imageUrl createdAt _id')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      headlines: headlines.map(news => ({
        id: news._id,
        title: news.title,
        image: news.imageUrl,
        createdAt: news.createdAt
      }))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching news headlines",
      error: err.message
    });
  }
};
