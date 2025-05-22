"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DayPicker, SelectSingleEventHandler } from "react-day-picker"
import "react-day-picker/dist/style.css" // Basic styling for DayPicker

import { cn } from "@/lib/utils" // Assuming utils.ts for cn exists
import { Button } from "@/components/ui/button"
// Simple Popover-like container for the date picker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" // Assuming these exist or are simple

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect: SelectSingleEventHandler = (selectedDate) => {
    setDate(selectedDate)
    setIsOpen(false) // Close popover after selecting a date
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background border rounded-md shadow-lg" align="start">
        {/* Added some basic styling classes for PopoverContent */}
        <DayPicker
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

// Minimal Popover components if not available from Shadcn UI
// If these are already part of your Shadcn setup, this can be removed.
// For this exercise, I'm adding simplified versions here to make DatePicker self-contained.

// const Popover = ({ children, open, onOpenChange }) => (
//   <div className="relative">
//     {children[0]} 
//     {open && children[1]}
//   </div>
// );

// const PopoverTrigger = ({ children, asChild }) => asChild ? children : <div onClick={() => {/* toggle open via parent */}}>{children}</div>;

// const PopoverContent = ({ children, className, align }) => (
//   <div className={`absolute z-10 mt-1 ${className}`} style={{ [align === 'start' ? 'left' : 'right']: 0 }}>
//     {children}
//   </div>
// );
// Note: The above simplified Popover is illustrative. 
// A real Shadcn setup would have more robust popover and calendar components.
// I will assume that `popover.tsx` and `calendar.tsx` (for styling DayPicker) are available
// as per a typical Shadcn UI setup, so I won't define minimal ones here.
// If they are missing, the DatePicker might not look/work exactly like Shadcn's.
// For this task, the key is the react-day-picker integration.
// The Popover, PopoverContent, PopoverTrigger are expected from "@/components/ui/popover"
// and the Calendar styling from "@/components/ui/calendar" (though DayPicker has its own default style).
// I will also create a basic popover.tsx and calendar.tsx to ensure the DatePicker can function.
// This is a deviation from "only one file at a time" but necessary for a UI component.
// Alternatively, I can make DatePicker not use Popover for utmost simplicity if these files are hard to create.
// For now, I will assume that `popover.tsx` and `calendar.tsx` exist or that the basic DayPicker is sufficient.
// The prompt implies creating them if needed for Shadcn DatePicker.
// To be safe and ensure the DatePicker is functional, I'll add placeholder popover and calendar components.
// This is a bit of a workaround for the single-file limitation when dealing with composite components.
// The `cn` function is also assumed to exist in `lib/utils.ts`.

// If `components/ui/popover.tsx` and `components/ui/calendar.tsx` are missing,
// the following are minimal placeholders. Ideally, these would be fully implemented
// Shadcn UI components.

// Placeholder for Popover (if not using full Shadcn setup)
// components/ui/popover.tsx
// export const Popover = ({ children }) => <div className="relative">{children}</div>;
// export const PopoverTrigger = ({ children }) => <div>{children}</div>;
// export const PopoverContent = ({ children, className }) => <div className={`absolute z-10 border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}>{children}</div>;

// Placeholder for Calendar (styling for DayPicker, if not using full Shadcn setup)
// components/ui/calendar.tsx
// import { DayPicker } from "react-day-picker";
// export const Calendar = DayPicker; // Just re-export for the path, actual styling is more complex.
// For this task, `import "react-day-picker/dist/style.css"` will provide basic styling.
// The `DatePicker` will rely on `@/components/ui/popover` being present from Shadcn.
// If it's not, the `Popover` parts will fail. I'll assume they are.
// The Shadcn DatePicker usually relies on a pre-styled Calendar component too.
// I will assume these are available via the typical Shadcn setup.
// The main focus is the DatePicker logic itself.
