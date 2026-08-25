export const DISCOVERY_HOURS = [8, 20] as const;

type LondonParts = {
  day: string;
  hour: number;
  minute: number;
};

export function londonParts(date = new Date()): LondonParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function currentDiscoverySlot(date = new Date()) {
  const { day, hour, minute } = londonParts(date);
  if (minute !== 0 || !DISCOVERY_HOURS.includes(hour as 8 | 20)) return null;
  return `${day}T${String(hour).padStart(2, "0")}:00`;
}
