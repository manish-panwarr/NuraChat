import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (to, otp, title) => {
  await transporter.sendMail({
    from: `"NeuraChat" <${process.env.EMAIL_USER}>`,
    to,
    subject: title,
    html: `
      <div style="
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #ffffff;
  width: 100%;
  max-width: 600px;
  margin: auto;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  overflow: hidden;
">

  <!-- Header -->
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
    ">NeuraChat</h1>
    <p style="
      margin-top: 6px;
      font-size: 16px;
      color: #eaeaea;
    ">Verification Code</p>
  </div>

  <!-- Body -->
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
      This code will expire in <b>2 minutes</b>.<br>
      If you didn’t request this, please ignore this email.
    </p>

    <div style="margin-top: 30px;">
      <img src="https://imglink.io/i/6e97a703-94e2-4899-9677-ec6988615933.jpg" 
           alt="NeuraChat Banner"
           style="width: 100%; border-radius: 10px;">
    </div>
  </div>

  <!-- Footer -->
  <div style="
    background: #f9f9f9;
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777777;
    border-top: 1px solid #eee;
  ">
    &copy; ${new Date().getFullYear()} <b>NeuraChat</b>. All rights reserved.<br>
    <span style="font-size: 11px;">A M_Creation Product</span>
  </div>
</div>

    `,
  });
};
