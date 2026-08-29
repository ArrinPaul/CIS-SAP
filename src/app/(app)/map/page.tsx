'use client';

import React from 'react';
import InteractiveCampusMap from '@/features/map/interactive-campus-map';
import { CAMPUS_ZONES, SAMPLE_EVENTS } from '@/features/map/map-data';
import { findPath } from '@/features/map/map-data';
import type { PathNode } from '@/features/map/map-data';

export default function MapPage() {
  const selectedZone = null;
  const selectedEvent = null;
  const currentPath: PathNode[] = [];
  const userLocation = null;
  const zoom = 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Maps & Navigation</h1>
      <div className="bg-card border border-border rounded-3xl overflow-hidden h-[700px]">
        <InteractiveCampusMap
          zones={CAMPUS_ZONES}
          events={SAMPLE_EVENTS}
          selectedZone={selectedZone}
          selectedEvent={selectedEvent}
          currentPath={currentPath}
          userLocation={userLocation}
          zoom={zoom}
          onZoneClick={() => {}}
          onEventClick={() => {}}
        />
      </div>
    </div>
  );
}

