const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Witamy w systemie CMMS!</h2>
      <p>Dzień dobry ${user.firstName},</p>
      <p>Twoje konto zostało utworzone w systemie CMMS. Oczekuje ono na akceptację przez administratora.</p>
      <p>Po akceptacji otrzymasz powiadomienie email z możliwością logowania.</p>
      <p>Dane konta:</p>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Imię i nazwisko:</strong> ${user.firstName} ${user.lastName}</li>
      </ul>
      <p>Pozdrawiamy,<br>Zespół CMMS</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Witamy w systemie CMMS - oczekiwanie na akceptację',
    html
  });
};

const sendAccountApprovedEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Konto zostało zatwierdzone!</h2>
      <p>Dzień dobry ${user.firstName},</p>
      <p>Twoje konto w systemie CMMS zostało zatwierdzone przez administratora.</p>
      <p>Możesz teraz zalogować się do systemu używając swoich danych:</p>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Rola:</strong> ${user.role}</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zaloguj się</a></p>
      <p>Pozdrawiamy,<br>Zespół CMMS</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Konto CMMS zostało zatwierdzone',
    html
  });
};

const sendAccountRejectedEmail = async (user, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Konto zostało odrzucone</h2>
      <p>Dzień dobry ${user.firstName},</p>
      <p>Niestety, Twoje konto w systemie CMMS zostało odrzucone przez administratora.</p>
      ${reason ? `<p><strong>Powód:</strong> ${reason}</p>` : ''}
      <p>W przypadku pytań, skontaktuj się z administratorem systemu.</p>
      <p>Pozdrawiamy,<br>Zespół CMMS</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Konto CMMS zostało odrzucone',
    html
  });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reset hasła - System CMMS</h2>
      <p>Dzień dobry ${user.firstName},</p>
      <p>Otrzymaliśmy prośbę o reset hasła dla Twojego konta.</p>
      <p>Kliknij poniższy link, aby zresetować hasło (link ważny przez 1 godzinę):</p>
      <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Resetuj hasło</a></p>
      <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
      <p>Pozdrawiamy,<br>Zespół CMMS</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Reset hasła - System CMMS',
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendPasswordResetEmail
};