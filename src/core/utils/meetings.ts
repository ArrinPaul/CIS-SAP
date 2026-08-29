/**
 * 1-on-1 Meeting Scheduling & Conflict Utilities
 */

/**
 * Pure conflict detection helper
 */
export function checkSlotConflict(
  newStart: Date,
  newEnd: Date,
  existingMeetings: { startTime: Date; endTime: Date; status: string }[]
): boolean {
  return existingMeetings.some((m) => {
    if (m.status === 'declined' || m.status === 'cancelled') {
      return false;
    }
    const start = new Date(m.startTime).getTime();
    const end = new Date(m.endTime).getTime();
    const targetStart = newStart.getTime();
    const targetEnd = newEnd.getTime();

    // Overlap occurs if target starts before existing ends AND target ends after existing starts
    return targetStart < end && targetEnd > start;
  });
}

/**
 * Pure available slot generation helper
 */
export function generateAvailableSlots(
  baseDate: Date,
  startHour: number = 9,
  endHour: number = 18,
  durationMinutes: number = 30
): { startTime: Date; endTime: Date }[] {
  const slots: { startTime: Date; endTime: Date }[] = [];
  const current = new Date(baseDate);
  current.setHours(startHour, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setHours(endHour, 0, 0, 0);

  while (current.getTime() + durationMinutes * 60000 <= endOfDay.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    slots.push({ startTime: slotStart, endTime: slotEnd });

    // Next slot
    current.setTime(current.getTime() + durationMinutes * 60000);
  }

  return slots;
}
