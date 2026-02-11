// tests/mocks/mongoose.js - Mongoose Mock for Unit Tests

const mockModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    findOneAndDelete: jest.fn().mockReturnThis(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
};

const createMockModel = (name) => {
    const Model = function (data) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(this);
        this.toObject = () => ({ ...this });
    };

    Object.assign(Model, { ...mockModel });
    Model.modelName = name;

    return Model;
};

module.exports = {
    mockModel,
    createMockModel,
};
