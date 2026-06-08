"use client";

import {
  joinWorkshopDatetimeLocal,
  splitWorkshopDatetimeLocal,
} from "@/lib/workshop-datetime";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function WorkshopDateTimeFields({ value, onChange, required }: Props) {
  const { date, time } = splitWorkshopDatetimeLocal(value);

  function updateDate(nextDate: string) {
    onChange(joinWorkshopDatetimeLocal(nextDate, time));
  }

  function updateTime(nextTime: string) {
    onChange(joinWorkshopDatetimeLocal(date, nextTime));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-brand-charcoal">
        Fecha
        <input
          type="date"
          required={required}
          value={date}
          onChange={(e) => updateDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-grey/40 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-brand-charcoal">
        Hora
        <input
          type="time"
          required={required}
          value={time}
          onChange={(e) => updateTime(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-grey/40 bg-white px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
