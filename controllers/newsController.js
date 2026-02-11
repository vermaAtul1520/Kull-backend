const { getNewsService } = require("../services/newsService");
const { getCommunityService } = require("../services/communityService");
const { getUserService } = require("../services/userService");

const newsService = getNewsService();
const communityService = getCommunityService();
const userService = getUserService();

// Create News for a specific community
exports.createNews = async (req, res, next) => {
  try {
    const { title, content, category, tags, imageUrl } = req.body;
    const { communityId } = req.params;
    const { role, community } = req.user;

    // Authorization: Community admin can only create for their community
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(userCommId) !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create news for your own community"
      });
    }

    const news = await newsService.createNews({
      title, content, category, tags, imageUrl
    }, communityId, req.user.id);

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

    const news = await newsService.getNewsById(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "News not found"
      });
    }

    // Authorization: Community admin can only update their community's news
    const isSuperAdmin = role === 'superadmin';
    const userCommId = community ? (community._id || community.id) : null;
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && String(news.community) === String(userCommId);

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only update news from your own community"
      });
    }

    const updated = await newsService.updateNews(id, req.body);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "News updated successfully",
      data: updated
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

    const news = await newsService.getNewsById(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "News not found"
      });
    }

    // Authorization: Community admin can only delete their community's news
    const isSuperAdmin = role === 'superadmin';
    const userCommId = community ? (community._id || community.id) : null;
    const isCommunityAdminAndOwn = roleInCommunity === 'admin' && String(news.community) === String(userCommId);

    if (!(isSuperAdmin || isCommunityAdminAndOwn)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only delete news from your own community"
      });
    }

    await newsService.deleteNews(id);
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
    const { role, community } = req.user;

    // Authorization: Non-superadmin users can only view their community's news
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(userCommId) !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    const newsList = await newsService.getNewsByCommunity(communityId);

    // Manual Populate
    const authorIds = newsList.map(n => n.author);
    const users = await userService.getManyByIds(authorIds);
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

    // Check if community fetch needed
    // Usually redundant if filtered by communityId, but to match response structure
    const comm = await communityService.getCommunityById(communityId);

    const populated = newsList.map(n => ({
      ...n,
      author: userMap[n.author] ? {
        _id: userMap[n.author].id || userMap[n.author]._id,
        firstName: userMap[n.author].firstName,
        lastName: userMap[n.author].lastName,
        email: userMap[n.author].email
      } : n.author,
      community: comm ? { name: comm.name } : n.community
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: populated
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
    const { role, community } = req.user;

    const news = await newsService.getNewsById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "News not found"
      });
    }

    // Authorization: Non-superadmin users can only view their community's news
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(news.community) !== String(userCommId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    // Populate
    const user = await userService.getUserById(news.author);
    const comm = await communityService.getCommunityById(news.community);

    const populated = {
      ...news,
      author: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : news.author,
      community: comm ? { name: comm.name } : news.community
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: populated
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

// Get news headlines for homepage slider
exports.getNewsHeadlines = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { role, community } = req.user;
    const limit = parseInt(req.query.limit) || 5;

    // Authorization: Non-superadmin users can only view their community's news
    const userCommId = community ? (community._id || community.id) : null;
    if (role !== 'superadmin' && String(userCommId) !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view news from your own community"
      });
    }

    // Repository should support limit/sort or we slice here
    // DynamoDB findByCommunity returns sorted desc
    const allNews = await newsService.getNewsByCommunity(communityId, { limit });

    const headlines = allNews.map(news => ({
      id: news.id || news._id,
      title: news.title,
      image: news.imageUrl,
      createdAt: news.createdAt
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      headlines
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
