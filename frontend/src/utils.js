export function today() {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
}

// return the date of the previous Monday (or this date, if it is a Monday)
export function startOfWeek(dateString, weekOffset) {
    const date = new Date(dateString);
    date.setDate(date.getDate() - (date.getDay() + 6) % 7); // Sun = 0, Mon = 1, ... Sat = 6
    if (weekOffset) {
        date.setDate(date.getDate() + weekOffset * 7);
    }
    return date;
}
