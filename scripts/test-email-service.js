require('dotenv').config();
const emailService = require('../services/emailService');
const path = require('path');

async function testEmailServices() {
    const testRecipient = process.env.TEST_RECIPIENT || 'test@example.com';
    const subject = 'KULL Email Service Test';
    const html = '<h1>Test Email</h1><p>This is a test of the KULL email service integration.</p>';

    console.log('--- Email Service Integration Test ---');
    console.log(`Test Recipient: ${testRecipient}`);
    console.log(`USE_AWS_SES: ${process.env.USE_AWS_SES}`);
    console.log(`USE_SENDGRID: ${process.env.USE_SENDGRID}`);
    console.log(`USE_NODEMAILER: ${process.env.USE_NODEMAILER}`);
    console.log('---------------------------------------');

    try {
        console.log('Attempting to send email...');
        const result = await emailService.sendEmail(testRecipient, subject, html);
        console.log('Result:', result);
        console.log('✅ Test Passed!');
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

testEmailServices();
