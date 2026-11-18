// Gửi thông báo: ntfy (push về điện thoại, miễn phí) và/hoặc email SMTP.
import nodemailer from "nodemailer";

export async function notify({ title, body, markdown }) {
  const results = [];
  if (process.env.NTFY_TOPIC) {
    const server = process.env.NTFY_SERVER || "https://ntfy.sh";
    const res = await fetch(`${server}/${encodeURIComponent(process.env.NTFY_TOPIC)}`, {
      method: "POST",
      headers: {
        // header HTTP chỉ nhận ASCII → mã hoá RFC 2047 (ntfy hỗ trợ)
        Title: /^[\x20-\x7E]*$/.test(title) ? title : "=?UTF-8?B?" + Buffer.from(title).toString("base64") + "?=",
        Markdown: "yes",
        Tags: "school",
        ...(process.env.APP_URL ? { Click: process.env.APP_URL } : {}),
      },
      body: body.slice(0, 3900),
    });
    results.push({ channel: "ntfy", ok: res.ok, status: res.status });
  }
  if (process.env.SMTP_HOST && process.env.NOTIFY_EMAIL_TO) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL_TO,
      subject: title,
      text: markdown || body,
    });
    results.push({ channel: "email", ok: true });
  }
  return results;
}
