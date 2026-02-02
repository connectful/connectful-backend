import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 2525, // El puerto que acordamos para evitar bloqueos
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }
    });

    // IMPORTANTE: Este log te dirá el código en la pantalla negra de Render
    console.log(`🔑 CÓDIGO GENERADO PARA ${to}: ${text.split(': ')[1] || text}`);

    await transporter.sendMail({
      from: `"Connectful" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    
    return true;
  } catch (error) {
    console.error("❌ El email no pudo salir, pero el código está en el log de arriba");
    return false;
  }
};
