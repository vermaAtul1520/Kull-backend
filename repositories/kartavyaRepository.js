// repositories/kartavyaRepository.js - Kartavya Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class KartavyaRepository extends CommunityEntityRepository {
    constructor() {
        super('Kartavya', 'kartavya', 'communityId');
    }
}

let kartavyaRepositoryInstance = null;
const getKartavyaRepository = () => {
    if (!kartavyaRepositoryInstance) {
        kartavyaRepositoryInstance = new KartavyaRepository();
    }
    return kartavyaRepositoryInstance;
};

module.exports = { KartavyaRepository, getKartavyaRepository };
