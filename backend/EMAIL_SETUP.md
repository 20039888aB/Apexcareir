# Email setup (production)

Apex Care IR sends invoice PDFs and scheduled reports through Django's SMTP backend.

## Gmail (recommended for Apexcareir)

1. Use a Google account with 2-Step Verification enabled.
2. Create an **App Password** at https://myaccount.google.com/apppasswords
3. Add these values to `backend/.env`:

```env
DEFAULT_FROM_EMAIL=apexcareir@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=apexcareir@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
EMAIL_USE_TLS=True
```

4. Restart the Django server after changing `.env`.

## Verify delivery

From the admin app:

1. Create or open an invoice
2. Click **Email** and send to your own address
3. Confirm the message includes the branded header, contact details, and PDF attachment

Backend tests mock SMTP for invoice email; a manual send confirms real delivery.

## Render / hosted deployments

Emails fail on Render for two common reasons:

1. **Missing SMTP env vars** on `apexcareir-api` (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`).
2. **No queue processor** — notifications are queued in the DB and only leave after `process_notification_emails` / the scheduler runs.

This project now:
- flushes the email queue immediately after creating notification emails
- starts `run_scheduler` inside the API container (`ENABLE_EMBEDDED_SCHEDULER=True`)

Still required: set the Gmail App Password as `EMAIL_HOST_PASSWORD` in the Render dashboard for `apexcareir-api`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SMTPAuthenticationError` | Use an app password, not your normal Gmail password |
| Email not received | Check spam; confirm `DEFAULT_FROM_EMAIL` matches `EMAIL_HOST_USER` for Gmail |
| Logs stuck on `queued` | Scheduler not running / SMTP not configured — check Render env + EmailNotificationLog |
| Connection timeout | Allow outbound port 587 on the server firewall |

## Other providers

Update `EMAIL_HOST`, `EMAIL_PORT`, and TLS settings for your provider (SendGrid, Outlook, etc.). Keep `DEFAULT_FROM_EMAIL` as the verified sender address.
