import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testBrevoEmail = async () => {
  try {
    console.log('Testing Brevo email sending...');

    // Configure Brevo API
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not found in environment variables');
    }

    if (!process.env.BREVO_SENDER_EMAIL) {
      throw new Error('BREVO_SENDER_EMAIL not found in environment variables');
    }

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Test email content
    sendSmtpEmail.subject = "Test Email from Brevo Integration";
    sendSmtpEmail.htmlContent = `
      <h2>Brevo Email Test</h2>
      <p>This is a test email to verify Brevo integration is working correctly.</p>
      <p>Test OTP: <strong>123456</strong></p>
      <p>If you received this email, the Brevo integration is successful!</p>
    `;
    sendSmtpEmail.sender = { "name": "CA Successful", "email": process.env.BREVO_SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": process.env.BREVO_SENDER_EMAIL }]; // Send to self for testing
    sendSmtpEmail.replyTo = { "email": process.env.BREVO_SENDER_EMAIL };

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Brevo email sent successfully!');
    console.log('Response:', result);

  } catch (error) {
    console.error('❌ Error testing Brevo email:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.body);
    }
  }
};

// Run the test
testBrevoEmail();
