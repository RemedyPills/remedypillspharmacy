import nodemailer from "nodemailer";

const PHARMACY_EMAIL = "remedypillspharmacy@gmail.com";
const PHARMACY_NAME = "RemedyPills Pharmacy";
const PHARMACY_ADDRESS = "Unit # 135, 246 Nolanridge Crescent NW, Calgary, AB T3R 1W9";

function getTransporter() {
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: PHARMACY_EMAIL,
      pass,
    },
  });
}

function parseAppointmentDateTime(dateStr: string, timeStr: string): { start: Date; end: Date } {
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hours = 0;
  let minutes = 0;

  if (timeParts) {
    hours = parseInt(timeParts[1]);
    minutes = parseInt(timeParts[2]);
    const period = timeParts[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  const start = new Date(`${dateStr}T00:00:00`);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  return { start, end };
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const SERVICE_LABELS: Record<string, string> = {
  "minor_ailment": "Minor Ailment Prescribing",
  "flu_vaccine": "Flu Vaccination",
  "covid_vaccine": "COVID-19 Vaccination",
  "travel_vaccine": "Travel Vaccination",
  "medication_review": "Medication Review",
  "bp_check": "Blood Pressure Check",
  "diabetes_check": "Diabetes Screening",
  "smoking_cessation": "Smoking Cessation Program",
  "travel_health": "Travel Health Consultation",
};

function getServiceLabel(service: string): string {
  return SERVICE_LABELS[service] || service.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function generateICS(data: {
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail?: string;
  attendeeName?: string;
  method: "REQUEST" | "CANCEL";
  sequence?: number;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RemedyPills Pharmacy//Patient Portal//EN",
    `METHOD:${data.method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${data.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(data.start)}`,
    `DTEND:${formatICSDate(data.end)}`,
    `SUMMARY:${data.summary}`,
    `DESCRIPTION:${data.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${data.location}`,
    `ORGANIZER;CN=${data.organizerName}:mailto:${data.organizerEmail}`,
    `SEQUENCE:${data.sequence || 0}`,
    `STATUS:${data.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
  ];

  if (data.attendeeEmail) {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${data.attendeeName || data.attendeeEmail}:mailto:${data.attendeeEmail}`);
  }

  lines.push(
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return lines.join("\r\n");
}

function appointmentConfirmationHtml(data: {
  patientName: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
  isForPharmacist: boolean;
}): string {
  const serviceLabel = getServiceLabel(data.service);
  const displayDate = formatDisplayDate(data.date);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a6b6d; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">📅 ${data.isForPharmacist ? "New Appointment Booking" : "Appointment Confirmed"}</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${PHARMACY_NAME}</p>
      </div>
      
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 12px 12px;">
        ${data.isForPharmacist ? `<p style="font-size: 14px; color: #374151;">A new appointment has been booked by <strong>${data.patientName}</strong>.</p>` : `<p style="font-size: 14px; color: #374151;">Hi <strong>${data.patientName}</strong>, your appointment has been confirmed!</p>`}
        
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 100px;">Service:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #1a6b6d;">${serviceLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Date:</td>
              <td style="padding: 8px 0; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time:</td>
              <td style="padding: 8px 0; font-weight: 600;">${data.time}</td>
            </tr>
            ${data.notes ? `<tr><td style="padding: 8px 0; color: #6b7280;">Notes:</td><td style="padding: 8px 0;">${data.notes}</td></tr>` : ""}
          </table>
        </div>

        <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>📍 Location:</strong> ${PHARMACY_NAME}<br/>
            ${PHARMACY_ADDRESS}
          </p>
        </div>

        ${!data.isForPharmacist ? `
        <div style="margin-top: 16px; font-size: 13px; color: #6b7280;">
          <p>This appointment has been added to your calendar. If you need to reschedule or cancel, please contact us at <a href="mailto:${PHARMACY_EMAIL}" style="color: #1a6b6d;">${PHARMACY_EMAIL}</a>.</p>
          <p style="margin-top: 8px;">Please arrive 5 minutes early and bring your Alberta Health Care card and any current medications.</p>
        </div>
        ` : `
        <div style="margin-top: 16px; font-size: 13px; color: #6b7280;">
          <p>This appointment has been added to the pharmacy calendar. Please review and prepare for this service.</p>
        </div>
        `}
      </div>
    </div>
  `;
}

export async function sendAppointmentConfirmation(data: {
  appointmentId: string;
  patientName: string;
  patientEmail?: string | null;
  service: string;
  date: string;
  time: string;
  notes?: string | null;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("Email not configured — skipping appointment confirmation.");
    return;
  }

  const { start, end } = parseAppointmentDateTime(data.date, data.time);
  const serviceLabel = getServiceLabel(data.service);
  const uid = `appt-${data.appointmentId}@remedypills.ca`;

  const icsEvent = generateICS({
    uid,
    summary: `${serviceLabel} — ${data.patientName}`,
    description: `Service: ${serviceLabel}\\nPatient: ${data.patientName}${data.notes ? `\\nNotes: ${data.notes}` : ""}`,
    location: `${PHARMACY_NAME}, ${PHARMACY_ADDRESS}`,
    start,
    end,
    organizerEmail: PHARMACY_EMAIL,
    organizerName: PHARMACY_NAME,
    attendeeEmail: data.patientEmail || undefined,
    attendeeName: data.patientName,
    method: "REQUEST",
  });

  const pharmacistHtml = appointmentConfirmationHtml({
    patientName: data.patientName,
    service: data.service,
    date: data.date,
    time: data.time,
    notes: data.notes || undefined,
    isForPharmacist: true,
  });

  try {
    await transporter.sendMail({
      from: `"${PHARMACY_NAME}" <${PHARMACY_EMAIL}>`,
      to: PHARMACY_EMAIL,
      subject: `New Appointment: ${serviceLabel} — ${data.patientName} (${data.date} ${data.time})`,
      html: pharmacistHtml,
      icalEvent: {
        method: "REQUEST",
        content: icsEvent,
      },
    });
    console.log(`Calendar invite sent to pharmacist: ${PHARMACY_EMAIL}`);
  } catch (err) {
    console.error("Failed to send pharmacist calendar invite:", err);
  }

  if (data.patientEmail) {
    const patientHtml = appointmentConfirmationHtml({
      patientName: data.patientName,
      service: data.service,
      date: data.date,
      time: data.time,
      notes: data.notes || undefined,
      isForPharmacist: false,
    });

    const patientIcs = generateICS({
      uid,
      summary: `${serviceLabel} at ${PHARMACY_NAME}`,
      description: `Your appointment for ${serviceLabel} at ${PHARMACY_NAME}.${data.notes ? `\\nNotes: ${data.notes}` : ""}`,
      location: `${PHARMACY_NAME}, ${PHARMACY_ADDRESS}`,
      start,
      end,
      organizerEmail: PHARMACY_EMAIL,
      organizerName: PHARMACY_NAME,
      attendeeEmail: data.patientEmail,
      attendeeName: data.patientName,
      method: "REQUEST",
    });

    try {
      await transporter.sendMail({
        from: `"${PHARMACY_NAME}" <${PHARMACY_EMAIL}>`,
        to: data.patientEmail,
        subject: `Appointment Confirmed: ${serviceLabel} on ${data.date} at ${data.time}`,
        html: patientHtml,
        icalEvent: {
          method: "REQUEST",
          content: patientIcs,
        },
      });
      console.log(`Calendar invite sent to patient: ${data.patientEmail}`);
    } catch (err) {
      console.error("Failed to send patient calendar invite:", err);
    }
  }
}

export async function sendAppointmentCancellation(data: {
  appointmentId: string;
  patientName: string;
  patientEmail?: string | null;
  service: string;
  date: string;
  time: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const { start, end } = parseAppointmentDateTime(data.date, data.time);
  const serviceLabel = getServiceLabel(data.service);
  const uid = `appt-${data.appointmentId}@remedypills.ca`;

  const cancelIcs = generateICS({
    uid,
    summary: `CANCELLED: ${serviceLabel} — ${data.patientName}`,
    description: `This appointment has been cancelled.`,
    location: `${PHARMACY_NAME}, ${PHARMACY_ADDRESS}`,
    start,
    end,
    organizerEmail: PHARMACY_EMAIL,
    organizerName: PHARMACY_NAME,
    method: "CANCEL",
    sequence: 1,
  });

  const cancelHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">❌ Appointment Cancelled</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${PHARMACY_NAME}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 14px;">The following appointment has been cancelled:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Service:</strong> ${serviceLabel}</p>
          <p style="margin: 4px 0 0; font-size: 14px;"><strong>Patient:</strong> ${data.patientName}</p>
          <p style="margin: 4px 0 0; font-size: 14px;"><strong>Date:</strong> ${data.date} at ${data.time}</p>
        </div>
        <p style="font-size: 13px; color: #6b7280;">This event has been removed from the calendar. To rebook, please visit the patient portal or call us.</p>
      </div>
    </div>
  `;

  const recipients = [PHARMACY_EMAIL];
  if (data.patientEmail) recipients.push(data.patientEmail);

  try {
    await transporter.sendMail({
      from: `"${PHARMACY_NAME}" <${PHARMACY_EMAIL}>`,
      to: recipients.join(", "),
      subject: `Cancelled: ${serviceLabel} — ${data.patientName} (${data.date})`,
      html: cancelHtml,
      icalEvent: {
        method: "CANCEL",
        content: cancelIcs,
      },
    });
    console.log("Cancellation calendar update sent.");
  } catch (err) {
    console.error("Failed to send cancellation:", err);
  }
}

export async function sendTransferEmail(data: {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email?: string;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyFax?: string;
  medicationName: string;
  rxNumber?: string;
  notes?: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("Email not configured. GMAIL_APP_PASSWORD is missing.");
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a6b6d; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">📋 New Prescription Transfer Request</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Submitted via RemedyPills Patient Portal</p>
      </div>
      
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 12px 12px;">
        <h3 style="color: #1a6b6d; margin-top: 0;">Patient Information</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Name:</td><td style="padding: 6px 0; font-weight: 600;">${data.firstName} ${data.lastName}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Date of Birth:</td><td style="padding: 6px 0;">${data.dob}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone:</td><td style="padding: 6px 0;">${data.phone}</td></tr>
          ${data.email ? `<tr><td style="padding: 6px 0; color: #6b7280;">Email:</td><td style="padding: 6px 0;">${data.email}</td></tr>` : ""}
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        
        <h3 style="color: #1a6b6d;">Current Pharmacy</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Pharmacy:</td><td style="padding: 6px 0; font-weight: 600;">${data.pharmacyName}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone:</td><td style="padding: 6px 0;">${data.pharmacyPhone}</td></tr>
          ${data.pharmacyFax ? `<tr><td style="padding: 6px 0; color: #6b7280;">Fax:</td><td style="padding: 6px 0;">${data.pharmacyFax}</td></tr>` : ""}
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        
        <h3 style="color: #1a6b6d;">Prescription Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Medication:</td><td style="padding: 6px 0; font-weight: 600;">${data.medicationName}</td></tr>
          ${data.rxNumber ? `<tr><td style="padding: 6px 0; color: #6b7280;">Rx Number:</td><td style="padding: 6px 0;">${data.rxNumber}</td></tr>` : ""}
          ${data.notes ? `<tr><td style="padding: 6px 0; color: #6b7280;">Notes:</td><td style="padding: 6px 0;">${data.notes}</td></tr>` : ""}
        </table>

        <div style="margin-top: 20px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 13px; color: #166534;">
          Please contact the patient's current pharmacy to initiate the transfer.
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${PHARMACY_NAME}" <${PHARMACY_EMAIL}>`,
    to: PHARMACY_EMAIL,
    subject: `Transfer Request: ${data.firstName} ${data.lastName} — ${data.medicationName}`,
    html,
  });
}
