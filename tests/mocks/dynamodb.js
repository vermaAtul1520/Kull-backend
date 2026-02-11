// tests/mocks/dynamodb.js - DynamoDB Mock for Unit Tests

const mockDocClient = {
    send: jest.fn(),
};

const mockDynamoDBClient = jest.fn(() => mockDocClient);

const mockCommands = {
    GetCommand: jest.fn((params) => ({ type: 'Get', ...params })),
    PutCommand: jest.fn((params) => ({ type: 'Put', ...params })),
    UpdateCommand: jest.fn((params) => ({ type: 'Update', ...params })),
    DeleteCommand: jest.fn((params) => ({ type: 'Delete', ...params })),
    QueryCommand: jest.fn((params) => ({ type: 'Query', ...params })),
    ScanCommand: jest.fn((params) => ({ type: 'Scan', ...params })),
    BatchWriteCommand: jest.fn((params) => ({ type: 'BatchWrite', ...params })),
    BatchGetCommand: jest.fn((params) => ({ type: 'BatchGet', ...params })),
    TransactWriteCommand: jest.fn((params) => ({ type: 'TransactWrite', ...params })),
};

// Reset all mocks
const resetMocks = () => {
    mockDocClient.send.mockReset();
    Object.values(mockCommands).forEach(mock => mock.mockClear());
};

// Helper to set up mock responses
const mockResponse = (data) => {
    mockDocClient.send.mockResolvedValueOnce(data);
};

const mockError = (error) => {
    mockDocClient.send.mockRejectedValueOnce(error);
};

module.exports = {
    mockDocClient,
    mockDynamoDBClient,
    mockCommands,
    resetMocks,
    mockResponse,
    mockError,
};
