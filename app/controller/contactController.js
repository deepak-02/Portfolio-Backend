import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Contact from "../models/Contact.js";
import { contactEmailHtml } from "../templates/contactEmail.js";

/* ------------------------------------------------------------------
   Contact form → email to the portfolio owner.

   Flow
   1. Validate input.
   2. Send the email (Brevo HTTP API first; Gmail SMTP as a fallback
      when EMAIL_USER / EMAIL_PASS are set).
   3. Reply right away: 200 only when an email was actually sent,
      otherwise 502, so the website shows a real result.
   4. Save the message to MongoDB in the background — strictly secondary.
      It runs after the reply, is time-limited and can never throw, so a
      missing, slow or broken database cannot delay or stop the email.
   ------------------------------------------------------------------ */

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEND_TIMEOUT_MS = 20000; // per mail provider
const DB_TIMEOUT_MS = 8000;    // background save

// Reject if a promise takes longer than `ms` (stops a hung provider/DB from hanging forever)
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms).unref?.()),
  ]);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// One full key (BREVO_API_KEY) is preferred; the older split variables still work.
const brevoApiKey = () =>
  process.env.BREVO_API_KEY ||
  [process.env.API_BREVO_API_KEY_1, process.env.API_BREVO_API_KEY_2].filter(Boolean).join("") ||
  [process.env.BREVO_API_KEY_1, process.env.BREVO_API_KEY_2].filter(Boolean).join("");

const recipientFor = (to) =>
  (to === "akshay" ? process.env.AKSHAY_EMAIL_TO : process.env.EMAIL_TO) || process.env.EMAIL_TO;

// Date/time in India Standard Time (the server itself runs in UTC).
const istStamp = (now = new Date()) => {
  const tz = "Asia/Kolkata";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "long", year: "numeric", weekday: "long" })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
  return { date: `${parts.day} ${parts.month} ${parts.year} (${parts.weekday})`, time, year: parts.year };
};

// Brevo transactional email via its REST API (plain fetch — clear error messages).
async function sendWithBrevo({ to, subject, html, replyTo }) {
  const key = brevoApiKey();
  if (!key) throw new Error("Brevo API key is not configured");
  if (!process.env.BREVO_FROM_EMAIL) throw new Error("BREVO_FROM_EMAIL is not configured");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_FROM_NAME || "Portfolio", email: process.env.BREVO_FROM_EMAIL },
      to: [{ email: to }],
      replyTo,
      subject,
      htmlContent: html,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    // Brevo explains the reason here, e.g. "Key not found", "unrecognised IP address", sender not valid
    throw new Error(`Brevo ${res.status}: ${text.slice(0, 300)}`);
  }
  try { return JSON.parse(text).messageId || "sent"; } catch { return "sent"; }
}

async function sendWithGmail({ to, subject, html, replyTo }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("Gmail fallback is not configured");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 15000,
  });
  const info = await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME || "Portfolio"}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    replyTo: { name: replyTo.name, address: replyTo.email },
  });
  return info.messageId;
}

// Secondary: never throws, never blocks. Any problem is only logged.
async function saveContact({ name, email, message, to, date, time }) {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn("[contact] MongoDB not connected — message not stored (email unaffected)");
      return;
    }
    await withTimeout(
      Contact.findOneAndUpdate(
        { email },
        { $set: { name, to }, $push: { messages: { message, date, time } } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).maxTimeMS(DB_TIMEOUT_MS).exec(),
      DB_TIMEOUT_MS,
      "MongoDB save"
    );
  } catch (err) {
    console.error("[contact] Failed to store message (email unaffected):", err?.message || err);
  }
}

export const submitContactForm = async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const message = String(req.body?.message ?? "").trim();
  const to = String(req.body?.to ?? "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) {
    return res.status(400).json({ error: "Invalid email format." });
  }
  if (name.length > LIMITS.name || message.length > LIMITS.message) {
    return res.status(400).json({ error: "Name or message is too long." });
  }

  const recipient = recipientFor(to);
  if (!recipient) {
    console.error("[contact] EMAIL_TO is not configured");
    return res.status(500).json({ error: "Mail service is not configured." });
  }

  const { date, time, year } = istStamp();
  const mail = {
    to: recipient,
    subject: `🚀 New Contact Form Submission | ${name.replace(/[\r\n]+/g, " ")}`,
    html: contactEmailHtml({
      name: escapeHtml(name),
      email: escapeHtml(email),
      message: escapeHtml(message),
      date,
      time,
      year,
      messageId: Math.random().toString(36).slice(2, 11).toUpperCase(),
    }),
    replyTo: { name, email },
  };

  let sentBy = null;
  for (const [label, send] of [["brevo", sendWithBrevo], ["gmail", sendWithGmail]]) {
    try {
      const id = await withTimeout(send(mail), SEND_TIMEOUT_MS, label);
      sentBy = label;
      console.log(`[contact] Email sent via ${label} (${id})`);
      break;
    } catch (err) {
      console.error(`[contact] ${label} failed:`, err.message);
    }
  }

  if (sentBy) res.status(200).json({ message: "Contact form submitted successfully." });
  else res.status(502).json({ error: "Could not send the email right now. Please try again later." });

  // After replying: keep a copy in MongoDB (also when mail failed, so nothing is lost).
  saveContact({ name, email, message, to, date, time });
};
