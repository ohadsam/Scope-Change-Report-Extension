export function calculateDateInFormat(dateString, daysToSubtract, beforeOrAfter) {
    const date = new Date(dateString);
    if (beforeOrAfter === 'after') {
        date.setUTCDate(date.getUTCDate() + daysToSubtract);
    } else {
        date.setUTCDate(date.getUTCDate() - daysToSubtract);
    }

    // Manually format to match: YYYY-MM-DDTHH:mm:ssZ (no milliseconds)
    const isoString = date.toISOString(); // e.g. "2025-03-25T12:00:00.000Z"
    return isoString.replace('.000', ''); // remove milliseconds
}