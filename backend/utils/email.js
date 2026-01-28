import SibApiV3Sdk from 'sib-api-v3-sdk';

const sendOTPEmail = async (email, otp) => {
  try {
    // Configure Brevo API
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = "Email Verification OTP";
    sendSmtpEmail.htmlContent = `
      <h2>Email Verification</h2>
      <p>Your OTP for email verification is:</p>
      <h3 style="font-size: 24px; font-weight: bold; color: #333; text-align: center; padding: 10px; border: 2px solid #007bff; border-radius: 5px; display: inline-block;">${otp}</h3>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    sendSmtpEmail.sender = { "name": "CA Successful", "email": process.env.BREVO_SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email }];
    sendSmtpEmail.replyTo = { "email": process.env.BREVO_SENDER_EMAIL };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('OTP email sent successfully via Brevo to:', email);
  } catch (error) {
    console.error('Error sending OTP email via Brevo:', error);
    throw new Error('Failed to send OTP email');
  }
};

export default sendOTPEmail;
