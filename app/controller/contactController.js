import Contact from "../models/Contact.js";
import nodemailer from "nodemailer";
import Brevo from "@getbrevo/brevo";

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, message,to } = req.body;
    console.log(name, email, message);
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Prepare date and time
    const now = new Date();
    const dateOptions = { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
    const [weekday, month, day, year] = formattedDate.replace(',', '').split(' ');
    const customDate = `${day} ${month} ${year} (${weekday})`;

    // Group by email: update or create
    let contact = await Contact.findOne({ email });
    if (contact) {
      // Update name if changed, and push new message
      contact.name = name;
      contact.messages.push({ message, date: customDate, time: formattedTime });
      await contact.save();
    } else {
      contact = await Contact.create({
        name,
        email,
        messages: [{ message, date: customDate, time: formattedTime }],
        to
      });
    }

    // Send email to portfolio owner

    const htmlContent  = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Contact Submission - Professional</title>
  <style>
    /* Email clients have limited animation support, so we keep these minimal */
    .professional-container {
      /* Removed animations for better email client compatibility */
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;min-height:100vh;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);border:1px solid #e5e7eb;overflow:hidden;">
          
          <!-- Professional Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);padding:32px 40px;position:relative;">
              <!-- Subtle pattern overlay -->
              <div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%);background-size:20px 20px;background-position:0 0, 0 10px, 10px -10px, -10px 0px;"></div>
              
              <div style="position:relative;z-index:2;text-align:center;">
                <div style="background:#ffffff;width:48px;height:48px;border-radius:12px;display:inline-block;text-align:center;line-height:48px;margin-bottom:16px;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <span style="color:#1e40af;font-size:24px;font-weight:bold;">&#9993;</span>
                </div>
                <h1 style="color:#ffffff;font-size:1.875rem;font-weight:700;margin:0 0 8px 0;letter-spacing:-0.025em;">New Contact Inquiry</h1>
                <p style="color:rgba(255, 255, 255, 0.9);font-size:1rem;margin:0;font-weight:400;">You have received a new message through your portfolio contact form</p>
              </div>
            </td>
          </tr>
          
          <!-- Contact Information Section -->
          <tr>
            <td style="padding:40px;">
              
              <!-- Section Header -->
              <div style="border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:32px;">
                <h2 style="color:#111827;font-size:1.25rem;font-weight:600;margin:0 0 4px 0;">Contact Details</h2>
                <p style="color:#6b7280;font-size:0.875rem;margin:0;">Information provided by the sender</p>
              </div>
              
              <!-- Contact Fields -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
                
                <!-- Name Row -->
                <tr>
                  <td style="padding:20px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:140px;vertical-align:top;padding-right:24px;">
                          <div style="background:#eff6ff;border-radius:6px;padding:8px;display:inline-block;margin-bottom:8px;width:32px;height:32px;text-align:center;line-height:32px;">
                            <span style="color:#1e40af;font-size:16px;">&#128100;</span>
                          </div>
                          <div style="color:#374151;font-weight:600;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;">Full Name</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="color:#111827;font-size:1.125rem;font-weight:500;margin-bottom:4px;">${name}</div>
                          <div style="color:#6b7280;font-size:0.875rem;">Contact person</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Email Row -->
                <tr>
                  <td style="padding:20px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:140px;vertical-align:top;padding-right:24px;">
                          <div style="background:#f0fdf4;border-radius:6px;padding:8px;display:inline-block;margin-bottom:8px;width:32px;height:32px;text-align:center;line-height:32px;">
                            <span style="color:#16a34a;font-size:16px;">&#9993;</span>
                          </div>
                          <div style="color:#374151;font-weight:600;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;">Email Address</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="color:#111827;font-size:1.125rem;font-weight:500;margin-bottom:4px;word-break:break-all;">${email}</div>
                          <div style="color:#6b7280;font-size:0.875rem;">Primary contact method</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Message Row -->
                <tr>
                  <td style="padding:20px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:140px;vertical-align:top;padding-right:24px;">
                          <div style="background:#fef3c7;border-radius:6px;padding:8px;display:inline-block;margin-bottom:8px;width:32px;height:32px;text-align:center;line-height:32px;">
                            <span style="color:#d97706;font-size:16px;">&#128172;</span>
                          </div>
                          <div style="color:#374151;font-weight:600;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;">Message</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-top:8px;">
                            <div style="color:#374151;font-size:1rem;line-height:1.6;white-space:pre-line;">${message}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Metadata Section -->
              <div style="margin-top:40px;background:#f8fafc;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
                <h3 style="color:#374151;font-size:1rem;font-weight:600;margin:0 0 16px 0;">Message Information</h3>
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:50%;padding-right:16px;">
                      <div style="background:#ffffff;border-radius:8px;padding:16px;border:1px solid #e5e7eb;">
                        <div style="color:#6b7280;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Date Received</div>
                        <div style="color:#111827;font-size:1rem;font-weight:600;">${customDate}</div>
                      </div>
                    </td>
                    <td style="width:50%;padding-left:16px;">
                      <div style="background:#ffffff;border-radius:8px;padding:16px;border:1px solid #e5e7eb;">
                        <div style="color:#6b7280;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Time Received</div>
                        <div style="color:#111827;font-size:1rem;font-weight:600;">${formattedTime}</div>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <div style="margin-top:16px;padding:16px;background:rgba(59, 130, 246, 0.1);border-radius:8px;border-left:4px solid #3b82f6;">
                  <div style="color:#1e40af;font-size:0.875rem;font-weight:500;">
                    &#128161; <strong>Reminder:</strong> This message was sent through your portfolio contact form. Please review and respond at your earliest convenience.
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Professional Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <div style="color:#6b7280;font-size:0.875rem;margin-bottom:8px;">
                This email was automatically generated by your portfolio contact system.
              </div>
              <div style="color:#9ca3af;font-size:0.75rem;line-height:1.5;">
                For support or to modify notification settings, please contact your system administrator.<br>
                © ${year} Portfolio Contact System. All rights reserved.
              </div>
              
              <!-- Footer Decoration -->
              <div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
                <div style="color:#d1d5db;font-size:0.75rem;">
                  Message ID: MSG-${Math.random().toString(36).substr(2, 9).toUpperCase()}
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `;



//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//       },
//     });
//     console.log("Transporter created");
//     let mailOptions 
// if(to=='akshay'){
//  mailOptions ={ from: email,
//       to: process.env.AKSHAY_EMAIL_TO,
//       subject: "🚀 New Contact Form Submission | " + name,
//       html: htmlContent,
//     };
// }
// else{
//    mailOptions ={ from: email,
//       to: process.env.EMAIL_TO,
//       subject: "🚀 New Contact Form Submission | " + name,
//       html: htmlContent,
//     };
// }

    //  transporter.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     return console.log('Error:', error);
    //   }
    //   console.log('Email sent:', info.response);
    // });

    // return res.status(200).json({ message: "Contact form submitted successfully." });

    // -----------------------------
    //  BREVO EMAIL SENDING SECTION
    // -----------------------------
    let apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      "xsmtpsib-2ed850093afcb980309080b797a5795150986d8581e6a330b033d76b25dc3195-G7JcflxOIhlJVYYc"
    );
    console.log("Brevo Api Key: => ",process.env.BREVO_API_KEY);
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    // Subject
    sendSmtpEmail.subject = "🚀 New Contact Form Submission | " + name;

    // HTML Body
    sendSmtpEmail.htmlContent = htmlContent;

    // IMPORTANT: Use verified sender (not customer email)
    sendSmtpEmail.sender = {
      name: process.env.BREVO_FROM_NAME, // Portfolio
      email: process.env.BREVO_FROM_EMAIL // portfolioweb.noreply@gmail.com
    };

    // User email set as reply-to
    sendSmtpEmail.replyTo = {
      name: name,
      email: email
    };

    // Receiver
    sendSmtpEmail.to = [
      {
        email: to === "akshay" ? process.env.AKSHAY_EMAIL_TO : process.env.EMAIL_TO
      }
    ];

    // Send email through Brevo
    await apiInstance.sendTransacEmail(sendSmtpEmail)
      .then((data) => {
        console.log("Brevo Email Sent:", data.body);
      })
      .catch((error) => {
        console.error("Brevo Email Error:", error);
      });

      return res.status(200).json({ message: "Contact form submitted successfully." });

  } catch (error) {
    console.error("Error submitting contact form:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while submitting the form." });
  }
};
