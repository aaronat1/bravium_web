"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation, type CaptionProps } from "react-day-picker"
import { format, type Locale } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function CalendarCaption({ displayMonth, locale }: CaptionProps & { locale?: Locale }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const { fromYear, toYear } = useDayPicker();

  const handleYearChange = (value: string) => {
    const year = Number(value);
    const newDate = new Date(displayMonth);
    newDate.setFullYear(year);
    goToMonth(newDate);
  };

  const handleMonthChange = (value: string) => {
    const month = Number(value);
    const newDate = new Date(displayMonth);
    newDate.setMonth(month);
    goToMonth(newDate);
  };

  const years = Array.from(
    { length: (toYear || new Date().getFullYear()) - (fromYear || 1900) + 1 },
    (_, i) => (fromYear || 1900) + i
  ).reverse();

  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex items-center justify-between px-1">
       <Button
        variant="outline"
        className="h-7 w-7 p-0"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1">
        <Select
          onValueChange={handleMonthChange}
          value={displayMonth.getMonth().toString()}
        >
          <SelectTrigger className="w-[120px] focus:ring-0">
            <SelectValue>
              {format(displayMonth, "MMMM", { locale })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {format(new Date(2000, month), "MMMM", { locale })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
  
        <Select
          onValueChange={handleYearChange}
          value={displayMonth.getFullYear().toString()}
        >
          <SelectTrigger className="w-[80px] focus:ring-0">
            <SelectValue>{displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        className="h-7 w-7 p-0"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      fromYear={new Date().getFullYear() - 100}
      toYear={new Date().getFullYear()}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        nav: "space-x-1 flex items-center",
        table: "w-full border-collapse space-y-1 mt-4",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (captionProps) => <CalendarCaption {...captionProps} locale={props.locale} />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }