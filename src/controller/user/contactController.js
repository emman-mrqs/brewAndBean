// src/controller/user/contactController.js
import nodemailer from 'nodemailer';

class ContactController {
  static getContact(req, res) {
    try {
      res.render('user/contact', {
        title: 'Contact Us - Bean & Brew',
        page: 'contact'
      });
    } catch (error) {
      console.error('Error rendering contact page:', error);
      res.status(500).render('error', { message: 'Internal Server Error' });
    }
  }

  // Handle contact form submission
  static async submitContactForm(req, res) {
    try {
      const { name, email, phone, subject, message } = req.body || {};

      // Basic server-side validation
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in all required fields.'
        });
      }

      // Create transporter (Gmail). Ensure dotenv.config() is called in your app entry.
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Build email HTML, escaping incoming values to avoid injection
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>New Contact Message — Bean & Brew</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone || 'N/A')}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr/>
          <p><strong>Message:</strong></p>
          <div style="padding:12px; background:#f7f7f7; border-radius:6px;">${escapeHtml(message).replace(/\n/g,'<br/>')}</div>
          <p style="font-size:0.9rem; color:#666; margin-top:12px;">IP: ${req.ip || 'unknown'}</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,      // deliver to site owner
        replyTo: email,                  // reply goes to visitor
        subject: `[Contact] ${subject} — ${name}`,
        html
      };

      await transporter.sendMail(mailOptions);

      return res.json({
        success: true,
        message: 'Message sent successfully.'
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }
  }
}

// Helper to escape HTML characters
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default ContactController;
