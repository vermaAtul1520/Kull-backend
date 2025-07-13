const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');
const emailTemplates = require('../config/emailTemplates');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Base template cache
let baseTemplate = null;

// Helper function to load base template
const loadBaseTemplate = async () => {
    if (baseTemplate) {
        return baseTemplate;
    }

    try {
        const templatePath = path.join(__dirname, '../templates/emails/base.html');
        baseTemplate = await fs.readFile(templatePath, 'utf-8');
        return baseTemplate;
    } catch (error) {
        console.error('Error loading base email template:', error);
        throw new Error('Base email template not found');
    }
};

// Helper function to replace placeholders in template
const replacePlaceholders = (template, data) => {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, value || '');
    }
    return result;
};

// Build email from template configuration
const buildEmailFromTemplate = async (templateName, data) => {
    try {
        const template = emailTemplates[templateName];
        if (!template) {
            throw new Error(`Email template '${templateName}' not found`);
        }

        // Load base template
        const baseHtml = await loadBaseTemplate();

        // Prepare template data with defaults
        const templateData = {
            // Base template variables
            emailTitle: replacePlaceholders(template.subject, data),
            headerGradient: template.headerGradient,
            primaryButtonColor: template.primaryButtonColor,
            accentColor: template.accentColor,
            headerIcon: template.headerIcon,
            headerTitle: replacePlaceholders(template.headerTitle, data),
            headerSubtitle: replacePlaceholders(template.headerSubtitle, data),
            emailContent: replacePlaceholders(template.content, data),
            footerText: replacePlaceholders(template.footerText, data),

            // Default data
            platformName: 'KULL',
            year: new Date().getFullYear(),
            supportEmail: process.env.SUPPORT_EMAIL || 'support@kull.com',

            // User provided data
            ...data
        };

        // Replace all placeholders in the base template
        const finalHtml = replacePlaceholders(baseHtml, templateData);
        const subject = replacePlaceholders(template.subject, data);

        return { html: finalHtml, subject };
    } catch (error) {
        console.error(`Error building email template '${templateName}':`, error);
        throw error;
    }
};

// Base email sending function
const sendEmail = async (to, subject, html, text = null) => {
    try {
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'noreply@kull.com',
                name: process.env.SENDGRID_FROM_NAME || 'KULL Platform'
            },
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        const response = await sgMail.send(msg);
        console.log(`Email sent successfully to ${to}: ${subject}`);
        return response;
    } catch (error) {
        console.error('SendGrid email error:', error);

        if (error.response) {
            console.error('SendGrid error body:', error.response.body);
        }

        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Generic template email sender
const sendTemplateEmail = async (templateName, to, data) => {
    try {
        const { html, subject } = await buildEmailFromTemplate(templateName, data);
        return await sendEmail(to, subject, html);
    } catch (error) {
        console.error(`Error sending ${templateName} email:`, error);
        throw error;
    }
};

// Specific email functions using templates
const sendWelcomeEmail = async (email, firstName) => {
    return await sendTemplateEmail('welcome', email, {
        firstName,
        loginUrl: `${process.env.FRONTEND_URL}/login`
    });
};

const sendJoinRequestEmail = async (email, firstName, communityName) => {
    return await sendTemplateEmail('joinRequest', email, {
        firstName,
        communityName,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
    });
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
    return await sendTemplateEmail('passwordReset', email, {
        firstName,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        expiryTime: '30 minutes'
    });
};

const sendCommunityApprovalEmail = async (email, firstName, communityName, joinKey) => {
    return await sendTemplateEmail('communityApproval', email, {
        firstName,
        communityName,
        joinKey,
        adminPanelUrl: `${process.env.FRONTEND_URL}/admin`
    });
};

const sendJoinApprovalEmail = async (email, firstName, communityName) => {
    return await sendTemplateEmail('joinApproval', email, {
        firstName,
        communityName,
        communityUrl: `${process.env.FRONTEND_URL}/community`
    });
};

const sendJoinRejectionEmail = async (email, firstName, communityName, rejectionReason) => {
    return await sendTemplateEmail('joinRejection', email, {
        firstName,
        communityName,
        rejectionReason: rejectionReason || 'No specific reason provided',
        contactUrl: `${process.env.FRONTEND_URL}/contact`
    });
};

// Additional template-based email functions
const sendJoinRequestNotificationToAdmin = async (adminEmail, adminName, userName, communityName) => {
    const { html, subject } = await buildEmailFromTemplate('welcome', {
        firstName: adminName,
        headerTitle: 'New Join Request',
        headerSubtitle: `Someone wants to join ${communityName}`,
        headerIcon: '👥',
        headerGradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        primaryButtonColor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        accentColor: '#ff9800'
    });

    // Custom content for admin notification
    const customContent = `
    <div class="greeting">Hi ${adminName}! 👋</div>
    
    <div class="message">
      You have a new join request for your community <strong>${communityName}</strong>.
    </div>
    
    <div class="highlight-box">
      <div class="highlight-title">New Member Request</div>
      <div class="highlight-value" style="font-size: 18px; letter-spacing: normal;">${userName}</div>
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/admin/pending-requests" class="cta-button large">Review Request</a>
    </div>
    
    <div class="message">
      Please review this request in your admin panel. You can approve or reject the request based on your community guidelines.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = `New Join Request - ${communityName}`;

    return await sendEmail(adminEmail, finalSubject, finalHtml);
};

const sendWelcomeToCommunityEmail = async (email, firstName, communityName) => {
    return await sendTemplateEmail('joinApproval', email, {
        firstName,
        communityName,
        communityUrl: `${process.env.FRONTEND_URL}/community`
    });
};

const sendCommunityRequestConfirmation = async (email, firstName, communityName) => {
    const { html, subject } = await buildEmailFromTemplate('joinRequest', {
        firstName,
        communityName: `"${communityName}" Registration`,
        headerTitle: 'Request Submitted!',
        headerSubtitle: 'Community registration request received',
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
    });

    const customContent = `
    <div class="status-badge status-info">📋 Under Review</div>
    
    <div class="greeting">Hi ${firstName}! 👋</div>
    
    <div class="message">
      Thank you for submitting your community registration request for <strong>${communityName}</strong>. 
      Our team will review your application and get back to you soon.
    </div>
    
    <div class="info-box info">
      <h3>What happens next?</h3>
      <div class="timeline-item">
        <div class="timeline-icon active"></div>
        <div class="timeline-text">Super admin reviews your community request</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon inactive"></div>
        <div class="timeline-text">You'll receive an email with the decision</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-icon inactive"></div>
        <div class="timeline-text">If approved, your community goes live with a unique join key</div>
      </div>
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">View Dashboard</a>
    </div>
    
    <div class="message">
      <strong>Review Process:</strong> Community registrations typically take 3-5 business days to review. 
      We carefully evaluate each request to ensure quality and authenticity.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = `Community Registration Submitted - ${communityName}`;

    return await sendEmail(email, finalSubject, finalHtml);
};

const sendCommunityRequestNotificationToSuperAdmin = async (adminEmail, adminName, communityName, requesterName) => {
    const { html, subject } = await buildEmailFromTemplate('welcome', {
        firstName: adminName,
        headerTitle: 'New Community Request',
        headerSubtitle: 'Pending super admin review',
        headerIcon: '🏢',
        headerGradient: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
        primaryButtonColor: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
        accentColor: '#9c27b0'
    });

    const customContent = `
    <div class="status-badge status-info">🔍 Needs Review</div>
    
    <div class="greeting">Hi ${adminName}! 👋</div>
    
    <div class="message">
      A new community registration request has been submitted and requires your review as super admin.
    </div>
    
    <div class="highlight-box">
      <div class="highlight-title">Community Request</div>
      <div class="highlight-value" style="font-size: 18px; letter-spacing: normal;">${communityName}</div>
      <p class="text-small text-center" style="color: #666; margin-top: 10px;">Requested by: ${requesterName}</p>
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/superadmin/community-requests" class="cta-button large">Review Request</a>
    </div>
    
    <div class="info-box warning">
      <h3>📋 Review Checklist</h3>
      <ul class="feature-list">
        <li>Verify community information and documentation</li>
        <li>Check requester credentials and contact details</li>
        <li>Ensure community name is appropriate and unique</li>
        <li>Review uploaded documents for authenticity</li>
      </ul>
    </div>
    
    <div class="message">
      Please review this request in your super admin panel. You can approve, reject, or request additional information.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = `New Community Registration Request - ${communityName}`;

    return await sendEmail(adminEmail, finalSubject, finalHtml);
};

const sendPasswordResetConfirmation = async (email, firstName) => {
    const { html, subject } = await buildEmailFromTemplate('welcome', {
        firstName,
        headerTitle: 'Password Reset Successful',
        headerSubtitle: 'Your password has been updated',
        headerIcon: '✅',
        headerGradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        primaryButtonColor: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        accentColor: '#28a745'
    });

    const customContent = `
    <div class="status-badge status-success">✅ Password Updated</div>
    
    <div class="greeting">Hi ${firstName}! 👋</div>
    
    <div class="message">
      Your password has been successfully reset. You can now log in to your account using your new password.
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/login" class="cta-button large">Login Now</a>
    </div>
    
    <div class="info-box warning">
      <h3>🔒 Security Reminder</h3>
      <p>If you didn't reset your password, please contact our support team immediately. 
      Your account security is our top priority.</p>
    </div>
    
    <div class="message">
      For your security, we recommend logging in and reviewing your account settings. 
      If you notice any suspicious activity, please contact support right away.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = 'Password Reset Successful - KULL';

    return await sendEmail(email, finalSubject, finalHtml);
};

const sendCommunityRejectionEmail = async (email, firstName, communityName, rejectionReason) => {
    const { html, subject } = await buildEmailFromTemplate('joinRejection', {
        firstName,
        communityName: `"${communityName}" Registration`,
        rejectionReason,
        contactUrl: `${process.env.FRONTEND_URL}/contact`,
        headerTitle: 'Community Request Update',
        headerSubtitle: 'Update on your registration request'
    });

    const customContent = `
    <div class="status-badge status-danger">❌ Not Approved</div>
    
    <div class="greeting">Hi ${firstName},</div>
    
    <div class="message">
      Thank you for your interest in creating the community <strong>${communityName}</strong> on our platform. 
      After careful review, your community registration request was not approved at this time.
    </div>
    
    <div class="info-box info">
      <h3>Reason for rejection:</h3>
      <p>${rejectionReason}</p>
    </div>
    
    <div class="message">
      This decision doesn't prevent you from submitting a new community request in the future. 
      We encourage you to address the concerns mentioned above and reapply when ready.
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/contact" class="cta-button">Contact Support</a>
      <a href="${process.env.FRONTEND_URL}/auth/request-community" class="cta-button secondary">Submit New Request</a>
    </div>
    
    <div class="message">
      If you have questions about this decision or need guidance on improving your application, 
      our support team is here to help.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = `Community Registration Update - ${communityName}`;

    return await sendEmail(email, finalSubject, finalHtml);
};

// Additional utility functions
const sendNewContentNotification = async (emails, contentTitle, communityName, authorName) => {
    try {
        const emailPromises = emails.map(async (email) => {
            const { html, subject } = await buildEmailFromTemplate('welcome', {
                firstName: 'Member',
                headerTitle: 'New Content Posted',
                headerSubtitle: `in ${communityName}`,
                headerIcon: '📢',
                headerGradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                primaryButtonColor: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                accentColor: '#2196f3'
            });

            const customContent = `
        <div class="greeting">Hello! 👋</div>
        
        <div class="message">
          New content has been posted in <strong>${communityName}</strong> by ${authorName}.
        </div>
        
        <div class="highlight-box">
          <div class="highlight-title">New Post</div>
          <div class="highlight-value" style="font-size: 18px; letter-spacing: normal;">${contentTitle}</div>
        </div>
        
        <div class="text-center">
          <a href="${process.env.FRONTEND_URL}/community/content" class="cta-button large">View Content</a>
        </div>
        
        <div class="message text-small" style="color: #888;">
          <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #888;">Unsubscribe from notifications</a>
        </div>
      `;

            const finalHtml = html.replace('{{emailContent}}', customContent);
            const finalSubject = `New Content in ${communityName} - ${contentTitle}`;

            return sendEmail(email, finalSubject, finalHtml);
        });

        return await Promise.allSettled(emailPromises);
    } catch (error) {
        console.error('Error sending new content notifications:', error);
        throw error;
    }
};

const sendEmailVerification = async (email, firstName, verificationToken) => {
    const { html, subject } = await buildEmailFromTemplate('welcome', {
        firstName,
        headerTitle: 'Verify Your Email',
        headerSubtitle: 'Complete your account setup',
        headerIcon: '📧',
        headerGradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        primaryButtonColor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        accentColor: '#ff9800'
    });

    const customContent = `
    <div class="greeting">Hi ${firstName}! 👋</div>
    
    <div class="message">
      Please verify your email address to complete your account setup and gain full access to the platform.
    </div>
    
    <div class="text-center">
      <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}" class="cta-button large">Verify Email</a>
    </div>
    
    <div class="info-box info">
      <h3>Why verify your email?</h3>
      <ul class="feature-list">
        <li>Secure your account and enable password recovery</li>
        <li>Receive important community notifications</li>
        <li>Unlock all platform features</li>
      </ul>
    </div>
    
    <div class="message">
      If you didn't create this account, you can safely ignore this email.
    </div>
  `;

    const finalHtml = html.replace('{{emailContent}}', customContent);
    const finalSubject = 'Verify Your Email - KULL';

    return await sendEmail(email, finalSubject, finalHtml);
};

const sendBulkEmailToCommunity = async (emails, subject, content, communityName) => {
    try {
        const emailPromises = emails.map(async (email) => {
            const { html } = await buildEmailFromTemplate('welcome', {
                firstName: 'Member',
                headerTitle: 'Community Update',
                headerSubtitle: `from ${communityName}`,
                headerIcon: '📢',
                headerGradient: 'linear-gradient(135deg, #673ab7 0%, #512da8 100%)',
                primaryButtonColor: 'linear-gradient(135deg, #673ab7 0%, #512da8 100%)',
                accentColor: '#673ab7'
            });

            const customContent = `
        <div class="greeting">Hello! 👋</div>
        
        <div class="message">
          You're receiving this message from <strong>${communityName}</strong>.
        </div>
        
        <div class="info-box">
          ${content}
        </div>
        
        <div class="message text-small" style="color: #888;">
          <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #888;">Unsubscribe from community emails</a>
        </div>
      `;

            const finalHtml = html.replace('{{emailContent}}', customContent);
            return sendEmail(email, subject, finalHtml);
        });

        return await Promise.allSettled(emailPromises);
    } catch (error) {
        console.error('Error sending bulk email:', error);
        throw error;
    }
};

// Clear template cache (useful for development)
const clearTemplateCache = () => {
    baseTemplate = null;
    console.log('Email template cache cleared');
};

module.exports = {
    sendWelcomeEmail,
    sendJoinRequestEmail,
    sendJoinRequestNotificationToAdmin,
    sendWelcomeToCommunityEmail,
    sendCommunityRequestConfirmation,
    sendCommunityRequestNotificationToSuperAdmin,
    sendPasswordResetEmail,
    sendPasswordResetConfirmation,
    sendCommunityApprovalEmail,
    sendCommunityRejectionEmail,
    sendJoinApprovalEmail,
    sendJoinRejectionEmail,
    sendNewContentNotification,
    sendEmailVerification,
    sendBulkEmailToCommunity,
    sendTemplateEmail, // For custom template emails
    sendEmail, // For completely custom emails
    clearTemplateCache
};