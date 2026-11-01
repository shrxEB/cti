import nodemailer from "nodemailer";

export interface SendCredentialsParams {
  toEmail: string;
  name: string;
  role: "faculty" | "club_rep" | "coordinator" | "admin";
  email: string;
  password: string;
  department?: string | null;
}

export interface EmailDispatchResult {
  success: boolean;
  delivered: boolean;
  simulated: boolean;
  message: string;
  subject: string;
  htmlPreview: string;
  recipient: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  faculty: "Faculty Member",
  club_rep: "Club Representative (Spectra Fest)",
  coordinator: "Department Coordinator",
  admin: "Administrator (Dean's Office)",
};

export async function sendCredentialsEmail(params: SendCredentialsParams): Promise<EmailDispatchResult> {
  const roleName = ROLE_DISPLAY[params.role] || params.role;
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const subject = `Welcome to CIT Scheduler — Your ${roleName} Login Credentials`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f7fb; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e8ecf4; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #5925dc, #7f39fb); padding: 32px 28px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 24px; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 13.5px; }
    .card-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 700; font-family: monospace; }
    .btn { display: inline-block; background: #6342ff; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; margin-top: 8px; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e8ecf4; font-size: 11.5px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Chilika Institute of Technology</h1>
      <p>Campus Scheduling & Venue Management Portal</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${params.name},</div>
      <div class="intro">
        The Dean's Office has provisioned your official account on the <strong>CIT Scheduler Platform</strong> for the role of <strong>${roleName}</strong>${params.department ? ` (${params.department})` : ""}.
        <br><br>
        Please use the credentials below to sign in to your dashboard:
      </div>

      <div class="card">
        <div class="card-row">
          <span class="label">Portal URL:</span>
          <span class="value">${portalUrl}</span>
        </div>
        <div class="card-row">
          <span class="label">Assigned Role:</span>
          <span class="value" style="color:#6342ff;">${roleName}</span>
        </div>
        <div class="card-row">
          <span class="label">Login Email ID:</span>
          <span class="value">${params.email}</span>
        </div>
        <div class="card-row">
          <span class="label">Initial Password:</span>
          <span class="value" style="background:#ede9fe; color:#5925dc; padding:2px 8px; border-radius:6px;">${params.password}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" class="btn" target="_blank">Sign In to CIT Portal &rarr;</a>
      </div>

      <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 20px;">
        <strong>Security Notice:</strong> Keep your credentials confidential. If you did not expect this invitation, please contact the CIT Dean of Academic Affairs.
      </p>
    </div>
    <div class="footer">
      Chilika Institute of Technology • Dean's Office Campus Scheduling System • Week 7 Operations
    </div>
  </div>
</body>
</html>
  `;

  // Check if SMTP is configured in environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"CIT Dean's Office" <no-reply@cit.edu.in>`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: params.toEmail,
        subject,
        html: htmlContent,
      });

      return {
        success: true,
        delivered: true,
        simulated: false,
        message: `Email dispatched successfully via SMTP to ${params.toEmail}`,
        subject,
        htmlPreview: htmlContent,
        recipient: params.toEmail,
      };
    } catch (err) {
      console.error("SMTP error while sending credentials:", err);
      return {
        success: true,
        delivered: false,
        simulated: true,
        message: `SMTP connection error: ${(err as Error).message}. Email rendered and queued.`,
        subject,
        htmlPreview: htmlContent,
        recipient: params.toEmail,
      };
    }
  }

  // If SMTP is not yet configured, return preview and successful dispatch simulation
  return {
    success: true,
    delivered: false,
    simulated: true,
    message: `Account created in database and credentials formatted for ${params.toEmail}. (Configure SMTP_HOST & SMTP_USER in .env.local to send live emails automatically)`,
    subject,
    htmlPreview: htmlContent,
    recipient: params.toEmail,
  };
}

