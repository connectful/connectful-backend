import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true, // Importante para puerto 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        // Esto evita bloqueos de seguridad comunes en correos de empresa
        rejectUnauthorized: false 
      }
    });

    console.log(`📩 Enviando correo desde soporte a: ${to}...`);

    await transporter.sendMail({
      from: `"Soporte Connectful" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: text,
    });
    
    console.log("✅ ¡Correo entregado con éxito!");
    return true;
  } catch (error) {
    console.error("❌ Error en el envío corporativo:", error.message);
    return false;
  }
};
