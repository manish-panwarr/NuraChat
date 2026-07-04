import nodemailer from "nodemailer";
import { Resend } from "resend";

export const sendOtpEmail = async (to, otp, title) => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  const htmlContent = `<div style="
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #ffffff;
  width: 100%;
  max-width: 600px;
  margin: auto;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  overflow: hidden;
">
  <div style="
    background: linear-gradient(90deg, #0066ff, #00bcd4);
    color: #fff;
    text-align: center;
    padding: 20px 18px;
  ">
    <h1 style="
      margin: 0;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 1px;
    ">ꍟ꒒ꀤꂦ</h1>
    <p style="
      margin-top: 6px;
      font-size: 16px;
      color: #eaeaea;
    ">Verification Code</p>
  </div>
  <div style="padding: 30px 25px; text-align: center;">
    <p style="
      font-size: 15px;
      color: #222222;
      margin-bottom: 12px;
      line-height: 1.6;
    ">
      <span style="font-size: 1.2rem; font-weight: 600; color: #0066ff;">Hello!</span><br>
      You requested a verification code. Use the code below to continue:
    </p>
    <h2 style="
      font-size: 38px;
      color: black;
      letter-spacing: 8px;
      margin: 25px 0;
      font-weight: bold;
    ">
      ${otp}
    </h2>
    <p style="
      font-size: 14px;
      color: #777777;
      line-height: 1.7;
    ">
      This code will expire in <b>5 minutes</b>.<br>
      If you didn't request this, please ignore this email.
    </p>
    <div style="margin-top: 30px;">
      <img src="https://imglink.io/i/6e97a703-94e2-4899-9677-ec6988615933.jpg" 
           alt="ꍟ꒒ꀤꂦ Banner"
           style="width: 100%; border-radius: 10px;">
    </div>
  </div>
  <div style="
    background: #f9f9f9;
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777777;
    border-top: 1px solid #eee;
  ">
    &copy; ${new Date().getFullYear()} <b>ꍟ꒒ꀤꂦ</b>. All rights reserved.<br>
    <span style="font-size: 11px;">A M_Creation Product</span>
  </div>
</div>`;

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      const info = await transporter.sendMail({
        from: `"NuraChat" <${emailUser}>`,
        to,
        subject: title,
        html: htmlContent,
      });
      console.log(`[Email] Gmail OTP email sent successfully to ${to}. MessageID: ${info.messageId}`);
      return;
    } catch (error) {
      console.error(`[Email] Gmail SMTP sending failed to ${to}:`, error.message);
      if (!resendApiKey) {
        throw new Error(`Gmail SMTP failed: ${error.message}`);
      }
      console.log(`[Email] Falling back to Resend API...`);
    }
  }

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const response = await resend.emails.send({
        from: "NuraChat <onboarding@resend.dev>",
        to,
        subject: title,
        html: htmlContent,
      });
      if (response.error) {
        console.error(`[Email] Resend API failed for ${to}:`, response.error);
        throw new Error(`Resend API failed: ${response.error.message || JSON.stringify(response.error)}`);
      }
      console.log(`[Email] Resend OTP email sent successfully to ${to}. ID: ${response.data?.id}`);
      return;
    } catch (error) {
      console.error(`[Email] Resend error caught:`, error.message);
      throw error;
    }
  }

  throw new Error("No email service configured. Please set EMAIL_USER/EMAIL_PASS or RESEND_API_KEY in environment variables.");
};
