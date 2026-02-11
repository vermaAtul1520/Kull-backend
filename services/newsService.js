// services/newsService.js - News Service

const { getNewsRepository } = require('../repositories/newsRepository');

class NewsService {
    constructor() {
        this.newsRepo = getNewsRepository();
    }

    async createNews(newsData, communityId, authorId) {
        return this.newsRepo.create({
            ...newsData,
            communityId,
            author: authorId,
        });
    }

    async getNewsById(newsId) {
        return this.newsRepo.findById(newsId);
    }

    async getNewsByCommunity(communityId, options = {}) {
        return this.newsRepo.findByCommunity(communityId, options);
    }

    async getPublishedNews(communityId, options = {}) {
        return this.newsRepo.findPublished(communityId, options);
    }

    async updateNews(newsId, updates) {
        return this.newsRepo.updateById(newsId, updates);
    }

    async deleteNews(newsId) {
        return this.newsRepo.deleteById(newsId);
    }
}

let instance = null;
const getNewsService = () => {
    if (!instance) instance = new NewsService();
    return instance;
};

module.exports = { NewsService, getNewsService };
