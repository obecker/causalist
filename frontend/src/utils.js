export function dateToString(date) {
  return date.toISOString().substring(0, 10);
}

export function today() {
  const date = new Date();
  return dateToString(new Date(date.getTime() - date.getTimezoneOffset() * 60000));
}

const millisPerDay = 24 * 60 * 60 * 1000;

// return the date of the previous Monday (or this date, if it is a Monday)
export function startOfWeek(dateString, weekOffset) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7); // Sun = 0, Mon = 1, ... Sat = 6
  if (weekOffset) {
    date.setTime(date.getTime() + weekOffset * 7 * millisPerDay);
  }
  return dateToString(date);
}

export function daysDiff(dateString1, dateString2) {
  if (!dateString1 || !dateString2) {
    return null;
  }
  const date1 = new Date(dateString1);
  const date2 = new Date(dateString2);
  const millisDiff = date2.getTime() - date1.getTime();
  return millisDiff / millisPerDay;
}

export function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setTime(date.getTime() + days * millisPerDay);
  return dateToString(date);
}

export function single(array) {
  if (!Array.isArray(array) || array.length !== 1) {
    return null;
  }
  return array[0];
}
