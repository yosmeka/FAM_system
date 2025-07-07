import nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendUserCreationEmail({
    email,
    name,
    password,
    role,
}: {
    email: string;
    name: string;
    password: string;
    role: string;
}) {
    const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL,
        to: email,
        subject: 'Welcome to Fixed Asset Management System',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Fixed Asset Management System</h2>
        <p>Hello ${name},</p>
        <p>Your account has been created successfully. Here are your login details:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Link:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">${process.env.NEXT_PUBLIC_APP_URL}/login</a></p>
        </div>
        <p><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
        <p>You can log in to the system using the credentials above.</p>
        <p>Best regards,<br>System Administrator</p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
} 