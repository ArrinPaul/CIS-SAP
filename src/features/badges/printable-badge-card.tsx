'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeAttendeeData, roleBadgeColors, formatAttendeeSubtitle } from '@/core/utils/badge-generator';
import { cn } from '@/core/utils/utils';

interface PrintableBadgeCardProps {
  badge: BadgeAttendeeData;
  className?: string;
  showLanyardGuide?: boolean;
}

export function PrintableBadgeCard({
  badge,
  className,
  showLanyardGuide = true,
}: PrintableBadgeCardProps) {
  const roleStyle = roleBadgeColors[badge.role] || roleBadgeColors.attendee;
  const subtitle = formatAttendeeSubtitle(badge.designationOrDegree, badge.companyOrCollege);

  return (
    <div
      className={cn(
        "relative w-[300px] h-[420px] bg-white text-slate-900 border-2 border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md print:shadow-none print:border print:border-slate-400 print:w-[3in] print:h-[4.2in] print:rounded-none select-none",
        className
      )}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* LANYARD PUNCH HOLE GUIDE (OPTIONAL) */}
      {showLanyardGuide && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full border border-dashed border-slate-400 bg-slate-100 flex items-center justify-center opacity-60 print:opacity-100">
          <span className="text-[8px] font-mono text-slate-500 uppercase">clip</span>
        </div>
      )}

      {/* TOP ROLE BANNER */}
      <div
        className="w-full pt-6 pb-2.5 px-4 text-center font-black tracking-widest text-xs uppercase shadow-sm border-b"
        style={{
          backgroundColor: roleStyle.bg,
          color: roleStyle.text,
          borderColor: roleStyle.border,
        }}
      >
        {roleStyle.label}
      </div>

      {/* BADGE BODY */}
      <div className="flex-1 px-5 py-3 flex flex-col items-center justify-between text-center">
        
        {/* EVENT TITLE */}
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider line-clamp-1">
            {badge.eventTitle}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {badge.eventDate} • {badge.venueName || 'Main Campus'}
          </p>
        </div>

        {/* ATTENDEE NAME & TITLE */}
        <div className="my-auto space-y-1 w-full">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-2">
            {badge.name}
          </h2>
          <p className="text-xs text-slate-600 font-medium line-clamp-1">
            {subtitle}
          </p>
        </div>

        {/* QR CODE & VERIFICATION */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none">
            <QRCodeSVG
              value={badge.qrPayload}
              size={92}
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="space-y-0.5">
            {badge.entryCode && (
              <p className="font-mono font-bold text-xs tracking-widest text-slate-800">
                PIN: {badge.entryCode}
              </p>
            )}
            <p className="font-mono text-[9px] text-slate-400">
              #{badge.ticketNumber}
            </p>
          </div>
        </div>

      </div>

      {/* BOTTOM BRANDING FOOTER */}
      <div className="w-full bg-slate-900 text-white py-1.5 px-4 flex items-center justify-between text-[9px] font-bold tracking-wider uppercase">
        <span className="text-cyan-400">EVENTRA PASS</span>
        <span className="text-slate-400 font-mono">HMAC SECURE</span>
      </div>

    </div>
  );
}
