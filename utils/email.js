import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465, // Forzamos el puerto seguro
      secure: true, // Obligatorio para puerto 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        // Esta parte es vital: evita que la conexión se corte por certificados
        rejectUnauthorized: false 
      },
      connectionTimeout: 10000, // 10 segundos de espera
    });

    console.log(`📤 Enviando correo a ${to}...`);

    await transporter.sendMail({
      from: `"Connectful Support" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    
    console.log("✅ ¡Email enviado con éxito!");
    return true;
  } catch (error) {
    console.error("❌ Error real en el envío:", error.message);
    return false;
  }
};
