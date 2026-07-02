// @ts-nocheck
import nodemailer from 'nodemailer';

/**
 * Initialize mail transporter (using Ethereal for testing, replace with SMTP for production)
 */
const initializeTransporter = async () => {
  // For production, use your actual email service (Gmail, SendGrid, Mailgun, etc.)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  return transporter;
};

let transporter = null;

export const getTransporter = async () => {
  if (!transporter) {
    transporter = await initializeTransporter();
  }
  return transporter;
};

/**
 * Send OTP email for password reset
 */
export const sendOtpEmail = async (email, otp, userName) => {
  try {
    const trans = await getTransporter();
    const mailOptions = {
      from: 'noreply@carpoolapp.com',
      to: email,
      subject: 'Password Reset OTP - Carpool App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Carpool App - Password Reset</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password. Use the OTP below to verify your identity:</p>
          
          <div style="background-color: #f0f9ff; border: 2px solid #10b981; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #10b981; margin: 0; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
          </div>
          
          <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">Carpool App © 2025</p>
        </div>
      `,
    };

    const info = await trans.sendMail(mailOptions);
    
    // For testing, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Mail preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

/**
 * Send email verification link after registration
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (email, firstName, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
  try {
    const trans = await getTransporter();
    const mailOptions = {
      from: 'noreply@stcarpool.com',
      to: email,
      subject: 'Verify your ST Carpool account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f1f5f9; border-radius: 12px;">
          <h2 style="color: #34d399; margin-bottom: 8px;">ST Carpool — Verify your email</h2>
          <p style="color: #94a3b8;">Hi ${firstName},</p>
          <p style="color: #cbd5e1;">Thanks for registering! Click the button below to verify your @st.com email address and activate your account.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #34d399; color: #0f172a; font-weight: bold; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">This link is valid for <strong style="color: #94a3b8;">1 hour</strong>. If you did not create an account, you can safely ignore this email.</p>
          <p style="color: #64748b; font-size: 11px;">Or copy this URL: ${verifyUrl}</p>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 20px 0;" />
          <p style="color: #475569; font-size: 11px; text-align: center;">ST Carpool Platform · Internal Employee Use Only</p>
        </div>
      `,
    };
    const info = await trans.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MAIL] Verification email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error('[MAIL] Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send welcome email after registration
 */
export const sendWelcomeEmail = async (email, firstName) => {
  try {
    const trans = await getTransporter();
    const mailOptions = {
      from: 'noreply@carpoolapp.com',
      to: email,
      subject: 'Welcome to Carpool App!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Welcome to Carpool App, ${firstName}!</h2>
          <p>Your account has been successfully created.</p>
          <p>You can now:</p>
          <ul style="color: #666;">
            <li>Search for available rides</li>
            <li>Offer rides to other employees</li>
            <li>Connect with your colleagues</li>
          </ul>
          <p>Happy carpooling!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">Carpool App © 2025</p>
        </div>
      `,
    };

    await trans.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};
