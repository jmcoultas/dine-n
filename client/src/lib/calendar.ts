import { MealTypeEnum } from "@db/schema";
import { z } from "zod";

type MealType = z.infer<typeof MealTypeEnum>;

// Get time based on meal type
export const getMealTime = (mealType: MealType): { hour: number; minute: number } => {
  switch (mealType) {
    case "Breakfast":
      return { hour: 8, minute: 0 };
    case "Lunch":
      return { hour: 12, minute: 0 };
    case "Dinner":
      return { hour: 18, minute: 0 };
    case "Snack":
      return { hour: 15, minute: 0 }; // Default to 3 PM for snacks
    case "Dessert":
      return { hour: 19, minute: 30 }; // Default to 7:30 PM for dessert
    default:
      return { hour: 12, minute: 0 }; // Default to noon
  }
};

// Format date to iCal format (YYYYMMDDTHHMMSSZ)
const formatDateToICal = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

interface CreateCalendarEventParams {
  title: string;
  description?: string;
  date: Date;
  mealType: MealType;
  durationMinutes?: number;
  recipeId?: number;
}

export const createCalendarEvent = async ({
  title,
  description = "",
  date,
  mealType,
  durationMinutes = 60,
  recipeId
}: CreateCalendarEventParams): Promise<string> => {
  console.log('Creating calendar event:', {
    title,
    description,
    date: date.toISOString(),
    mealType,
    durationMinutes,
    recipeId,
    location: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      href: window.location.href
    },
    timestamp: new Date().toISOString()
  });

  const { hour, minute } = getMealTime(mealType);
  console.log('Calculated meal time:', { hour, minute, mealType });
  
  // Set start time
  const startDate = new Date(date);
  startDate.setHours(hour, minute, 0, 0);
  
  // Set end time
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  // Add recipe URL to description if recipeId is provided
  let fullDescription = description;
  let recipeUrl = '';
  if (recipeId) {
    // Always use the recipe page URL
    recipeUrl = `${window.location.origin}/recipe/${recipeId}`;

    console.log('Adding recipe URL:', {
      recipeUrl,
      recipeId,
      originalDescription: description,
      location: {
        origin: window.location.origin,
        pathname: window.location.pathname,
        href: window.location.href
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Create iCal content
  const icalContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DESCRIPTION:${fullDescription}`,
    `DTSTART:${formatDateToICal(startDate)}`,
    `DTEND:${formatDateToICal(endDate)}`,
    ...(recipeUrl ? [`URL:${recipeUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");

  console.log('Generated iCal content:', {
    startDate: formatDateToICal(startDate),
    endDate: formatDateToICal(endDate),
    fullDescription,
    icalContent,
    timestamp: new Date().toISOString()
  });
  
  return icalContent;
};

// Function to trigger the calendar download
export const downloadCalendarEvent = async (
  params: CreateCalendarEventParams
): Promise<void> => {
  console.log('Downloading calendar event:', {
    params: {
      ...params,
      date: params.date.toISOString()
    },
    location: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      href: window.location.href
    },
    timestamp: new Date().toISOString()
  });

  try {
    const icalContent = await createCalendarEvent(params);
    const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    const filename = `${params.title.replace(/\s+/g, "_")}.ics`;
    link.setAttribute("download", filename);
    
    console.log('Created download link:', {
      filename,
      contentType: "text/calendar;charset=utf-8",
      blobSize: blob.size,
      blobType: blob.type,
      timestamp: new Date().toISOString()
    });

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Calendar download initiated successfully');
  } catch (error) {
    console.error('Error downloading calendar event:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        ...params,
        date: params.date.toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}; 