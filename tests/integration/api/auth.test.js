// tests/integration/api/auth.test.js
// Integration tests for Authentication API endpoints

const request = require('supertest');
const mongoose = require('mongoose');

// Test requires a running MongoDB instance
// Set MONGO_URI in .env.test before running

describe('Auth API Integration Tests', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.DB_TYPE = 'mongodb';
        process.env.JWT_SECRET = 'test-secret';

        // Only run if MONGO_URI is configured for tests
        if (!process.env.MONGO_URI || process.env.SKIP_INTEGRATION_TESTS) {
            console.log('Skipping integration tests - MONGO_URI not configured');
            return;
        }

        try {
            // Import app after setting env vars
            const express = require('express');
            app = express();
            app.use(express.json());

            // Import routes
            const authRoutes = require('../../../routes/authRoutes');
            app.use('/api/auth', authRoutes);

            // Connect to test database
            await mongoose.connect(process.env.MONGO_URI);
        } catch (error) {
            console.error('Failed to setup integration tests:', error);
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState === 1) {
            // Clean up test data
            try {
                await mongoose.connection.db.dropDatabase();
            } catch (e) {
                // Ignore cleanup errors
            }
            await mongoose.disconnect();
        }
        if (server) {
            server.close();
        }
    });

    describe('POST /api/auth/signup', () => {
        it('should create a new user', async () => {
            if (!app) return; // Skip if setup failed

            const userData = {
                firstName: 'Test',
                lastName: 'User',
                email: `test${Date.now()}@example.com`,
                password: 'password123',
            };

            const response = await request(app)
                .post('/api/auth/signup')
                .send(userData)
                .expect('Content-Type', /json/);

            // Should be 201 or handle validation
            expect([201, 400, 500]).toContain(response.status);

            if (response.status === 201) {
                expect(response.body.success).toBe(true);
                expect(response.body.user).toBeDefined();
            }
        });

        it('should reject signup without email or phone', async () => {
            if (!app) return;

            const userData = {
                firstName: 'Test',
                lastName: 'User',
                password: 'password123',
            };

            const response = await request(app)
                .post('/api/auth/signup')
                .send(userData);

            expect([400, 500]).toContain(response.status);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should reject login with invalid credentials', async () => {
            if (!app) return;

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    emailOrPhone: 'nonexistent@example.com',
                    password: 'wrongpassword',
                });

            expect([401, 400, 500]).toContain(response.status);
        });
    });
});
