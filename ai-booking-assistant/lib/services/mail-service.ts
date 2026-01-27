import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
  auth?: {
    user: string;
    pass: string;
  };
}

export const sendEmail = async (options: MailOptions) => {
  // Use provided auth or fallback to env (env is mostly for testing now)
  const user = options.auth?.user || process.env.GMAIL_USER;
  const pass = options.auth?.pass || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error('Email credentials missing');
    return { success: false, error: 'Email credentials missing' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const mailOptions = {
    from: user,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};
