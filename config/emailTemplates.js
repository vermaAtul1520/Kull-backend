// Email template configurations with content blocks
const emailTemplates = {
  welcome: {
    subject: 'Welcome to {{platformName}}!',
    headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accentColor: '#667eea',
    headerIcon: '👋',
    headerTitle: 'Welcome to {{platformName}}!',
    headerSubtitle: 'Your community platform awaits',
    content: `
      <div class="greeting">Hello {{firstName}}! 👋</div>
      
      <div class="message">
        Welcome to {{platformName}}, the premier multi-community platform where connections thrive and communities flourish. We're excited to have you join our growing family of engaged community members.
      </div>
      
      <div class="info-box info">
        <h3>🚀 Platform Features</h3>
        <ul class="feature-list">
          <li>Join multiple communities with unique access keys</li>
          <li>Access community-specific content and discussions</li>
          <li>Connect with like-minded community members</li>
          <li>Stay updated with real-time notifications</li>
        </ul>
      </div>
      
      <div class="text-center">
        <a href="{{loginUrl}}" class="cta-button large">Get Started</a>
      </div>
      
      <div class="info-box success">
        <h3>What's next?</h3>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-text">Complete your profile setup</div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-text">Join your first community using a join key</div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-text">Explore community content and start engaging</div>
          </div>
        </div>
      </div>
    `,
    footerText: 'Need help getting started? Contact our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  },

  joinRequest: {
    subject: 'Join Request Submitted - {{communityName}}',
    headerGradient: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    accentColor: '#4CAF50',
    headerIcon: '✅',
    headerTitle: 'Request Submitted Successfully!',
    headerSubtitle: 'We\'ve received your community join request',
    content: `
      <div class="status-badge status-warning">⏳ Pending Approval</div>
      
      <div class="greeting">Hi {{firstName}}! 👋</div>
      
      <div class="message">
        Great news! Your request to join the community has been successfully submitted and is now awaiting admin approval.
      </div>
      
      <div class="highlight-box">
        <div class="highlight-title">Community</div>
        <div class="highlight-value" style="font-size: 18px; letter-spacing: normal;">{{communityName}}</div>
      </div>
      
      <div class="info-box info">
        <h3>What happens next?</h3>
        <div class="timeline-item">
          <div class="timeline-icon active"></div>
          <div class="timeline-text">Community admin reviews your request</div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon inactive"></div>
          <div class="timeline-text">You'll receive an email notification with the decision</div>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon inactive"></div>
          <div class="timeline-text">If approved, you'll gain access to community content</div>
        </div>
      </div>
      
      <div class="text-center">
        <a href="{{dashboardUrl}}" class="cta-button">View Dashboard</a>
      </div>
      
      <div class="message">
        <strong>Please note:</strong> The approval process typically takes 24-48 hours. Community admins carefully review each request to maintain the quality and security of their community.
      </div>
    `,
    footerText: 'Questions about your request? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  },

  passwordReset: {
    subject: 'Password Reset Request - {{platformName}}',
    headerGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    accentColor: '#ff6b6b',
    headerIcon: '🔐',
    headerTitle: 'Password Reset',
    headerSubtitle: 'Secure your account with a new password',
    content: `
      <div class="info-box warning">
        <p><strong>Security Notice:</strong> This password reset was requested for your account. If you didn't request this, please ignore this email and contact support.</p>
      </div>
      
      <div class="greeting">Hello {{firstName}}! 👋</div>
      
      <div class="message">
        We received a request to reset the password for your {{platformName}} account. To proceed with resetting your password, please click the button below.
      </div>
      
      <div class="text-center">
        <a href="{{resetUrl}}" class="cta-button large">Reset My Password</a>
      </div>
      
      <div class="info-box info">
        <h3>⏰ Important Information</h3>
        <p>This password reset link will expire in <strong>{{expiryTime}}</strong>. If the link expires, you'll need to request a new password reset.</p>
      </div>
      
      <div class="info-box">
        <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-size: 12px; color: #666; margin-top: 10px;">{{resetUrl}}</p>
      </div>
      
      <div class="info-box success">
        <h3>🛡️ Security Tips</h3>
        <ul class="feature-list">
          <li>Choose a strong password with at least 8 characters</li>
          <li>Include uppercase letters, lowercase letters, numbers, and symbols</li>
          <li>Don't reuse passwords from other accounts</li>
          <li>Consider using a password manager</li>
        </ul>
      </div>
      
      <div class="message">
        <strong>Didn't request this reset?</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your account remains secure and no changes have been made.
      </div>
    `,
    footerText: 'Need help? Contact our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  },

  communityApproval: {
    subject: 'Community Approved - {{communityName}}',
    headerGradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    accentColor: '#28a745',
    headerIcon: '🎉',
    headerTitle: 'Community Approved!',
    headerSubtitle: 'Your community is now live on {{platformName}}',
    content: `
      <div class="text-center mb-20">🎊</div>
      
      <div class="status-badge status-success">✅ Approved & Active</div>
      
      <div class="greeting">Congratulations {{firstName}}! 🎈</div>
      
      <div class="message">
        We're thrilled to inform you that your community registration has been approved! Your community is now officially live on the {{platformName}} platform.
      </div>
      
      <div class="highlight-box">
        <div class="highlight-title">{{communityName}}</div>
        <p style="color: #666; margin: 10px 0;">is now ready for members!</p>
      </div>
      
      <div class="highlight-box">
        <div class="highlight-title">Your Community Join Key</div>
        <div class="highlight-value">{{joinKey}}</div>
        <p class="text-small text-center" style="color: #666; font-style: italic;">Share this key with people you want to invite</p>
      </div>
      
      <div class="info-box warning">
        <h3>👑 As the Community Admin, you can now:</h3>
        <ul class="feature-list">
          <li>Manage member join requests and approvals</li>
          <li>Create and publish content for your community</li>
          <li>Moderate discussions and comments</li>
          <li>View community analytics and member activity</li>
          <li>Customize community settings and preferences</li>
          <li>Generate new join keys if needed</li>
        </ul>
      </div>
      
      <div class="text-center">
        <a href="{{adminPanelUrl}}" class="cta-button large">Access Admin Panel</a>
        <a href="{{adminPanelUrl}}/settings" class="cta-button secondary">Community Settings</a>
      </div>
      
      <div class="info-box info">
        <h3>🚀 Next Steps</h3>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-text">Complete your community profile and add a description</div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-text">Share your join key with potential members</div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-text">Create your first post to welcome new members</div>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-text">Set up community guidelines and rules</div>
          </div>
        </div>
      </div>
      
      <div class="message">
        <strong>Important:</strong> Keep your join key secure and only share it with people you want in your community. You can always generate a new key from your admin panel if needed.
      </div>
    `,
    footerText: 'Questions about managing your community? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  },

  joinApproval: {
    subject: 'Join Request Approved - {{communityName}}',
    headerGradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    accentColor: '#28a745',
    headerIcon: '🎉',
    headerTitle: 'Welcome to {{communityName}}!',
    headerSubtitle: 'Your join request has been approved',
    content: `
      <div class="status-badge status-success">✅ Approved</div>
      
      <div class="greeting">Great news {{firstName}}! 🎊</div>
      
      <div class="message">
        Your request to join <strong>{{communityName}}</strong> has been approved! You now have full access to all community content, discussions, and features.
      </div>
      
      <div class="highlight-box">
        <div class="highlight-title">You're now a member of</div>
        <div class="highlight-value" style="font-size: 18px; letter-spacing: normal;">{{communityName}}</div>
      </div>
      
      <div class="text-center">
        <a href="{{communityUrl}}" class="cta-button large">Explore Community</a>
      </div>
      
      <div class="info-box info">
        <h3>🚀 What you can do now:</h3>
        <ul class="feature-list">
          <li>View and interact with community content</li>
          <li>Participate in discussions and comments</li>
          <li>Connect with other community members</li>
          <li>Receive notifications about new content</li>
          <li>Access exclusive community resources</li>
        </ul>
      </div>
      
      <div class="message">
        We're excited to have you as part of our community! Don't hesitate to introduce yourself and start engaging with other members.
      </div>
    `,
    footerText: 'Questions about the community? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  },

  joinRejection: {
    subject: 'Join Request Update - {{communityName}}',
    headerGradient: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
    primaryButtonColor: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
    accentColor: '#6c757d',
    headerIcon: '📋',
    headerTitle: 'Join Request Update',
    headerSubtitle: 'Update on your community request',
    content: `
      <div class="status-badge status-danger">❌ Not Approved</div>
      
      <div class="greeting">Hi {{firstName}},</div>
      
      <div class="message">
        Thank you for your interest in joining <strong>{{communityName}}</strong>. After careful review, your join request was not approved at this time.
      </div>
      
      <div class="info-box info">
        <h3>Reason provided:</h3>
        <p>{{rejectionReason}}</p>
      </div>
      
      <div class="message">
        This decision doesn't prevent you from applying to other communities on our platform or reapplying to this community in the future if circumstances change.
      </div>
      
      <div class="text-center">
        <a href="{{contactUrl}}" class="cta-button">Contact Support</a>
      </div>
      
      <div class="message">
        If you have questions about this decision or would like guidance on other communities that might be a good fit, please don't hesitate to reach out to our support team.
      </div>
    `,
    footerText: 'Questions? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>'
  }
};

module.exports = emailTemplates;