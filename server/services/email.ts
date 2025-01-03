import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('Missing SENDGRID_API_KEY environment variable');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailService = {
  async sendPasswordResetEmail(email: string, resetToken: string, userId: number) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.PRODUCTION_URL || 'https://your-domain.com'
      : 'http://localhost:3000';

    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&userId=${userId}`;

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_VERIFIED_SENDER || 'your-verified-sender@yourdomain.com',
        name: 'Meal Planner Support'
      },
      subject: 'Reset Your Password - Meal Planner',
      text: `Please click the following link to reset your password: ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5; margin-bottom: 24px;">Reset Your Password</h1>
          <p style="color: #374151; font-size: 16px; line-height: 24px;">
            You recently requested to reset your password for your Meal Planner account. 
            Click the button below to proceed.
          </p>
          <div style="margin: 32px 0;">
            <a href="${resetLink}" 
               style="background-color: #4F46E5; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 4px; 
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6B7280; font-size: 14px;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
          <p style="color: #6B7280; font-size: 14px;">
            This password reset link will expire in 1 hour.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      const result = await sgMail.send(msg);
      console.log('Password reset email sent successfully:', {
        messageId: result[0]?.headers['x-message-id'],
        statusCode: result[0]?.statusCode,
      });
      return true;
    } catch (error: any) {
      console.error('Error sending password reset email:', {
        error: error.message,
        response: error.response?.body,
      });
      throw new Error(
        `Failed to send password reset email: ${error.message}`
      );
    }
  }
};