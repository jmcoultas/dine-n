import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('Missing SENDGRID_API_KEY environment variable');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailService = {
  async sendPasswordResetEmail(email: string, resetToken: string, userId: number) {
    const resetLink = `${process.env.CLIENT_URL || ''}/reset-password?token=${resetToken}&userId=${userId}`;
    
    const msg = {
      to: email,
      from: 'noreply@mealplanner.com', // Replace with your verified sender
      subject: 'Reset Your Password - Meal Planner',
      text: `Please click the following link to reset your password: ${resetLink}`,
      html: `
        <div>
          <h1>Reset Your Password</h1>
          <p>You recently requested to reset your password for your Meal Planner account. Click the button below to proceed.</p>
          <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Reset Password</a>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p>This password reset link will expire in 1 hour.</p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
};
