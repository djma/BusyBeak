import dayjs, { ManipulateType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import tz from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(tz);
dayjs.extend(utc);
dayjs.extend(customParseFormat);

export const LA = "America/Los_Angeles";
type DateUnitTypeShort = "d" | "D" | "M" | "y";
type DateUnitTypeLong = "day" | "month" | "year";
type DateUnitTypeLongPlural = "days" | "months" | "years";
export type DateManipulateType =
  | DateUnitTypeShort
  | DateUnitTypeLong
  | DateUnitTypeLongPlural;
export class LocalDate {
  /**
   * Local date in ISO format (YYYY-MM-DD)
   */
  private localDate: string;

  private constructor(localDate: string) {
    this.localDate = localDate;
  }

  static today(timezone: string) {
    // Today is not aware of timezone so it needs to be passed in.
    return new LocalDate(dayjs().tz(timezone).format("YYYY-MM-DD"));
  }

  static todayLA() {
    return LocalDate.today("America/Los_Angeles");
  }

  static todaySystem() {
    return new LocalDate(dayjs().format("YYYY-MM-DD"));
  }

  /**
   * JS's Date is implicitly an instant in time, so when constructing it from a string, it will
   * do weird things like
   * 1) if the string is 10-digit date, it will assume it's in UTC,
   * 2) if the string is YYYY-MM-DDTHH:mm:ss, it will assume it's in local time,
   * 3) if the string is YYYY-MM-DDTHH:mm:ssZ, it will assume it's in UTC.
   *
   * This method assumes the user has the correct Date object in mind and will only convert
   * the instant to the local date in the target timezone.
   */
  static fromDate(date: Date, timezone: string) {
    return new LocalDate(dayjs(date).tz(timezone).format("YYYY-MM-DD"));
  }

  static from(localDate: string) {
    checkOk(
      dayjs(localDate, "YYYY-MM-DD", true).isValid(),
      `invalid local date: ${localDate}`
    );
    return new LocalDate(localDate);
  }

  static fromLocalDatetime(datetime: string, fromTz: string, toTz: string) {
    checkOk(
      guessLocalOrZoned(datetime) === "local",
      `invalid local datetime: ${datetime}`
    );
    return new LocalDate(
      dayjs.tz(datetime, fromTz).tz(toTz).format("YYYY-MM-DD")
    );
  }

  static fromZonedDatetime(datetime: string, toTz: string) {
    checkOk(
      guessLocalOrZoned(datetime) === "zoned",
      `invalid zoned datetime: ${datetime}`
    );
    return new LocalDate(dayjs(datetime).tz(toTz).format("YYYY-MM-DD"));
  }

  plus(amount: number, unit: DateManipulateType) {
    return new LocalDate(
      dayjs(this.localDate).add(amount, unit).format("YYYY-MM-DD")
    );
  }

  minus(amount: number, unit: DateManipulateType) {
    return new LocalDate(
      dayjs(this.localDate).subtract(amount, unit).format("YYYY-MM-DD")
    );
  }

  dayOfMonth() {
    return dayjs(this.localDate).date();
  }

  month(verbose: boolean = false) {
    const month = dayjs(this.localDate).month();
    switch (month) {
      case 0:
        return verbose ? "January" : "Jan";
      case 1:
        return verbose ? "February" : "Feb";
      case 2:
        return verbose ? "March" : "Mar";
      case 3:
        return verbose ? "April" : "Apr";
      case 4:
        return "May";
      case 5:
        return verbose ? "June" : "Jun";
      case 6:
        return verbose ? "July" : "Jul";
      case 7:
        return verbose ? "August" : "Aug";
      case 8:
        return verbose ? "September" : "Sep";
      case 9:
        return verbose ? "October" : "Oct";
      case 10:
        return verbose ? "November" : "Nov";
      case 11:
        return verbose ? "December" : "Dec";
      default:
        throw new Error(
          `unexpected month for time ${this.localDate}: ${month}`
        );
    }
  }

  dayOfWeek() {
    const day = dayjs(this.localDate).day();
    switch (day) {
      case 0:
        return "Sunday";
      case 1:
        return "Monday";
      case 2:
        return "Tuesday";
      case 3:
        return "Wednesday";
      case 4:
        return "Thursday";
      case 5:
        return "Friday";
      case 6:
        return "Saturday";
      default:
        throw new Error(
          `unexpected day of week for time ${this.localDate}: ${day}`
        );
    }
  }

  getLastSunday(): LocalDate {
    const dayOfWeek = dayjs(this.localDate).day();
    return this.minus(dayOfWeek, "day");
  }

  format(format?: string) {
    if (format) {
      return dayjs(this.localDate).format(format);
    } else {
      return this.localDate;
    }
  }

  toString() {
    return this.localDate;
  }

  toJSON() {
    return this.localDate;
  }

  equals(other: LocalDate) {
    return this.localDate === other.localDate;
  }

  toMidnightDate(timezone: string): Date {
    return dayjs.tz(this.localDate, timezone).toDate();
  }
}

export function nowMinus(value: number, unit?: ManipulateType): Date {
  return dayjs().subtract(value, unit).toDate();
}

export function nowPlus(value: number, unit?: ManipulateType): Date {
  return dayjs().add(value, unit).toDate();
}

export function dateMinus(date: Date, value: number, unit: ManipulateType) {
  return dayjs(date).subtract(value, unit).toDate();
}

export function datePlus(date: Date, value: number, unit: ManipulateType) {
  return dayjs(date).add(value, unit).toDate();
}

export function durationFormat({
  minutes,
  seconds,
}: {
  minutes: number;
  seconds: number;
}) {
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m${seconds}s`;
}

export function intervalToDuration(
  start: Date,
  end: Date
): { minutes: number; seconds: number } {
  const diff = end.getTime() - start.getTime();
  checkOk(diff >= 0, "end time should be after start time");
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  return { minutes, seconds: seconds - minutes * 60 };
}

export function secondsSinceNow(timeString: string) {
  const time = new Date(`${timeString}`).getTime();
  const today = new Date().getTime();
  return (today - time) / 1000;
}

export function parseFromTz(date: string, timezone: string): Date {
  return dayjs.tz(date, timezone).toDate();
}

export function formatInTz(date: Date, timezone: string, format: string) {
  return dayjs(date).tz(timezone).format(format);
}

export function guessLocalOrZoned(date: string) {
  if (
    date.includes("Z") ||
    date.includes("+") ||
    (date.includes("T") && date.split("T")[1].includes("-"))
  ) {
    return "zoned";
  } else {
    return "local";
  }
}

export function checkOk(val: any, msg?: string): asserts val {
  if (!Boolean(val)) {
    throw new Error(msg || `expected truthy value but got ${val}`);
  }
}
