export const MULTI_HOME_INSPECTION_FEE = 3500;
export const inspectionFee = (homes: number) => homes >= 2 ? MULTI_HOME_INSPECTION_FEE : 0;
export function isAgentProfileComplete(profile: Record<string, unknown> | null | undefined) {
  if (!profile) return false;
  return String(profile.full_name ?? "").trim().length >= 2 &&
    /^\+?[0-9 ]{10,15}$/.test(String(profile.phone ?? "")) &&
    String(profile.home_address ?? "").trim().length >= 5 &&
    String(profile.email ?? "").trim().length > 3 &&
    String(profile.avatar_url ?? "").trim().length > 0;
}

export const PROPERTY_TYPES = ["Single room", "Self-contain", "Room & parlour", "Mini flat", "1-bed flat", "2-bed flat", "3-bed flat", "Shared hostel", "Duplex"];

/** betterhouse receipt ID, derived from the payment so it is always the same. */
export const receiptId = (paymentId: string) => "BH-" + paymentId.replace(/-/g, "").slice(0, 10).toUpperCase();

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function inspectionEvent(title: string, location: string, start: Date, minutes = 60) {
  const end = new Date(start.getTime() + minutes * 60000);
  const text = `Inspection: ${title}`;
  const details = "betterhouse inspection. Manage it at betterhouse.space/app/bookings";
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${icsDate(start)}/${icsDate(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(text)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//betterhouse//EN", "BEGIN:VEVENT", `UID:${icsDate(start)}-${Math.random().toString(36).slice(2)}@betterhouse.space`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${text}`, `LOCATION:${location}`, `DESCRIPTION:${details}`, "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Inspection reminder", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return { google, outlook, ics };
}
