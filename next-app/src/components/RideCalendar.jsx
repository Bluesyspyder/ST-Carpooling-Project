"use client";

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function RideCalendar({ rides }) {

  const events = rides.map((ride) => ({
    title: ride.status,
    start: new Date(ride.date),
    end: new Date(ride.date),
    status: ride.status,
  }));

  const eventStyleGetter = (event) => {

    let background = "#10b981";

    if (event.status === "Completed")
      background = "#22c55e";

    if (event.status === "Cancelled")
      background = "#ef4444";

    if (event.status === "Pending")
      background = "#f59e0b";

    if (event.status === "Upcoming")
      background = "#3b82f6";

    return {
      style: {
        backgroundColor: background,
        borderRadius: "8px",
        border: "none",
        color: "white",
      },
    };
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 600 }}
      eventPropGetter={eventStyleGetter}
    />
  );
}