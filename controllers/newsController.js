const News = require("../models/News");

// Create News (only superadmin or community admin)
exports.createNews = async (req, res, next) => {
  try {
    const { title, content, category, tags, imageUrl } = req.body;
   
    const news = new News({
      title,
      content,
      category,
      tags,
      community:req.user.community,
      imageUrl,
      author: req.user.id
    });

    await news.save();
    res.status(201).json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

// Update News (only superadmin or community admin)
exports.updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    Object.assign(news, req.body);
    await news.save();

    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

// Delete News (only superadmin or community admin)
exports.deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id);
    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    await news.deleteOne();
    res.json({ success: true, message: "News deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Get all news for logged-in user's community
exports.getCommunityNews = async (req, res, next) => {
  try {
    const communityId = req.user.community; // from authenticated user
    console.log("cccccccccccc",communityId)
    const newsList = await News.find({ community: communityId })
      .populate("author", "firstName lastName email")
      .populate("community", "name")
      .sort({ createdAt: -1 }); // recent first

    res.json({ success: true, data: newsList });
  } catch (err) {
    next(err);
  }
};

// Get single news (only from user's community)
exports.getSingleNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const news = await News.findOne({ _id: id, community: req.user.community })
      .populate("author", "firstName lastName email")
      .populate("community", "name");

    if (!news) return res.status(404).json({ success: false, message: "News not found" });

    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};
