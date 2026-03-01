import twilio from "twilio";

let cachedCredentials: {
  accountSid: string;
  apiKey: string;
  apiKeySecret: string;
  phoneNumber: string;
} | null = null;

async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;

  // Standard (non-Replit) deployment expects Twilio credentials in environment variables.
  // Prefer API Key auth (recommended), but you can also switch to Account SID + Auth Token if you want.
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const phoneNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !apiKey || !apiKeySecret || !phoneNumber) {
    throw new Error(
      "Missing Twilio env vars. Required: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_KEY_SECRET, TWILIO_FROM_NUMBER",
    );
  }

  cachedCredentials = { accountSid, apiKey, apiKeySecret, phoneNumber };
  return cachedCredentials;
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, { accountSid });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function sendSmsToPatients(
  phones: { userId: string; phone: string }[],
  message: string,
  mediaUrl?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromPhoneNumber();

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { userId, phone } of phones) {
    try {
      const params: any = {
        body: message,
        from: fromNumber,
        to: phone,
      };
      if (mediaUrl) {
        params.mediaUrl = [mediaUrl];
      }
      await client.messages.create(params);
      sent++;
    } catch (err: any) {
      failed++;
      errors.push(`${phone}: ${err.message || "Unknown error"}`);
    }
  }

  return { sent, failed, errors };
}
