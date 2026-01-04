'use client';

// Note: Schedule controls are now per-target in the TargetForm
// This component is kept for potential future global scheduling features

export default function ScheduleControls() {
  return (
    <div className="text-sm text-gray-600">
      <p>Scheduling is configured per-target. Edit a target to change its frequency.</p>
    </div>
  );
}
