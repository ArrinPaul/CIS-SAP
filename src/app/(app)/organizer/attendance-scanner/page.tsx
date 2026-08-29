import ComputerVisionAttendanceScanner from '@/features/organizer/cv-attendance-scanner';

export const metadata = {
  title: 'CV Attendance Scanner | Eventra',
  description: 'Optical crowd headcount and venue density monitoring.',
};

export default function AttendanceScannerPage() {
  return <ComputerVisionAttendanceScanner />;
}
