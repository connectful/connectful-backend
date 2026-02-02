import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465, 
      secure: true, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // AÑADIMOS ESTO PARA EVITAR EL TIMEOUT
      connectionTimeout: 20000, // 20 segundos de espera
      greetingTimeout: 20000,
    });

    await transporter.sendMail({
      from: `"Connectful" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    
    console.log("✅ Email enviado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error.message);
    return false;
  }
};
