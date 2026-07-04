import { Resend } from "resend";

const buildHtml = (otp) => `<div style="
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
    ">NuraChat</h1>
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
  </div>
  <div style="
    background: #f9f9f9;
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777777;
    border-top: 1px solid #eee;
  ">
    &copy; ${new Date().getFullYear()} <b>NuraChat</b>. All rights reserved.<br>
    <span style="font-size: 11px;">A M_Creation Product</span>
  </div>
</div>`;

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (to, otp, title) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [to],
    subject: title,
    html: buildHtml(otp),
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    throw new Error("Failed to send email");
  }

  console.log(`[Email] Sent via Resend id=${data?.id} to=${to}`);
};
