import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // <--- ESTA LÍNEA ES LA CLAVE PARA EL PUERTO 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    
    console.log("✅ Email enviado correctamente a", to);
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return false;
  }
};
