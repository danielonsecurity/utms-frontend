interface Task {
  id: string;
  name: string;
  scheduled: { start: Date; end: Date };
  actual?: { start: Date; end: Date };
  status: "completed" | "in-progress" | "scheduled" | "cancelled" | "pending";
  tags: string[];
  isAnchor?: boolean;
  notes?: string; // Optional notes
}

const generateRandomTime = (
  baseDate: Date,
  startHour: number,
  endHour: number,
): Date => {
  const date = new Date(baseDate);
  const hour =
    Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  const minute = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

const taskNames = [
  "Project Phoenix Kickoff",
  "Client Follow-up Call",
  "Team Sync",
  "Bug Triage",
  "Documentation Review",
  "Feature Brainstorming",
  "Code Refactor Session",
  "Performance Optimization",
  "User Testing Setup",
  "Marketing Strategy Meeting",
  "Content Creation Block",
  "Design Iteration",
  "Infrastructure Update",
  "Financial Planning",
  "HR Onboarding",
  "Quick Break",
  "Coffee Run",
  "Lunch",
  "Deep Work Session",
  "Urgent Fix: Prod Issue",
  "Review Pull Request",
  "Plan Next Sprint",
  "Research New Tech",
  "Write Blog Post",
  "Gym Session",
  "Doctor Appointment",
  "Grocery Shopping",
  "Cook Dinner",
  "Family Time",
  "Read a Book",
  "Learn New Skill Online",
  "Side Project Work",
  "Networking Event Prep",
  "Presentation Rehearsal",
  "Catch up on Emails",
  "Admin Tasks",
  "Pay Bills",
  "Meditate",
  "Walk the Dog",
  "Call Mom",
  "Plan Weekend",
  "Fix Leaky Faucet",
  "Movie Night",
  "Game Night",
  "Social Media Posting",
  "Yoga Class",
  "Volunteer Work",
  "Study Session",
  "Write Thank You Notes",
];

const tagsPool = [
  "work",
  "personal",
  "meeting",
  "urgent",
  "planning",
  "dev",
  "design",
  "marketing",
  "writing",
  "learning",
  "health",
  "chore",
  "social",
  "finance",
  "family",
];

const statuses: Task["status"][] = [
  "completed",
  "in-progress",
  "scheduled",
  "cancelled",
  "pending",
];

export const getMasterSampleTasks = (): Task[] => {
  const tasks: Task[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Normalize today to noon for easier day offsets

  let taskIdCounter = 1;

  for (let dayOffset = -5; dayOffset <= 5; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);

    const tasksPerDay = Math.floor(Math.random() * 6) + 3; // 3 to 8 tasks per day

    for (let i = 0; i < tasksPerDay; i++) {
      const taskName = taskNames[Math.floor(Math.random() * taskNames.length)];

      // More varied start and end times, allowing for longer tasks
      let startHour = Math.floor(Math.random() * 17) + 6; // 6 AM to 10 PM (6 to 22)
      if (taskName.includes("Lunch") || taskName.includes("Dinner"))
        startHour = Math.random() > 0.5 ? 12 : 18;
      if (taskName.includes("Wake Up") || taskName.includes("Morning"))
        startHour = Math.floor(Math.random() * 3) + 6; // 6-8 AM
      if (taskName.includes("Night"))
        startHour = Math.floor(Math.random() * 3) + 20; // 8-10 PM

      const startTime = generateRandomTime(
        currentDate,
        startHour,
        Math.min(startHour + 2, 22),
      ); // Tasks usually start within a 2 hour window of their ideal start, capping at 10pm

      let durationMinutes = Math.floor(Math.random() * 120) + 15; // 15 mins to 2 hours 15 mins
      if (taskName.includes("Meeting") || taskName.includes("Call"))
        durationMinutes = Math.random() > 0.3 ? 30 : 60;
      if (taskName.includes("Quick") || taskName.includes("Break"))
        durationMinutes = Math.floor(Math.random() * 15) + 5; // 5-20 mins
      if (taskName.includes("Session") || taskName.includes("Block"))
        durationMinutes = Math.floor(Math.random() * 120) + 60; // 1-3 hours
      if (taskName.includes("Lunch") || taskName.includes("Dinner"))
        durationMinutes = Math.floor(Math.random() * 30) + 45; // 45-75 mins
      if (taskName.includes("Appointment") || taskName.includes("Gym"))
        durationMinutes = Math.floor(Math.random() * 30) + 60;

      // Introduce some overlap: occasionally make a task start before the previous one on the same day *could* end
      // This is tricky to do naturally without making it too messy.
      // A simpler way is just to have dense scheduling.
      // Or, explicitly make a task start a bit earlier, overlapping with a previous one.
      let effectiveStartTime = startTime;
      if (
        tasks.length > 0 &&
        Math.random() < 0.15 &&
        tasks[tasks.length - 1].scheduled.end > startTime
      ) {
        // 15% chance to overlap slightly with previous IF it's on same day
        const prevTask = tasks[tasks.length - 1];
        if (
          prevTask.scheduled.start.toDateString() === startTime.toDateString()
        ) {
          effectiveStartTime = addMinutes(
            prevTask.scheduled.start,
            Math.floor(
              (Math.random() *
                (prevTask.scheduled.end.getTime() -
                  prevTask.scheduled.start.getTime())) /
                60000 /
                2,
            ),
          ); // Start somewhere within the first half of previous task
        }
      }

      const endTime = addMinutes(effectiveStartTime, durationMinutes);

      // Ensure end time is not past midnight of the current day unless it's a "night" task
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (endTime > endOfDay && !taskName.toLowerCase().includes("night")) {
        endTime.setTime(endOfDay.getTime());
        if (effectiveStartTime > endTime) {
          // if duration made it invalid
          effectiveStartTime = addMinutes(endTime, -durationMinutes);
        }
      }

      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const numTags = Math.floor(Math.random() * 4); // 0 to 3 tags
      const taskTags: string[] = [];
      for (let j = 0; j < numTags; j++) {
        taskTags.push(tagsPool[Math.floor(Math.random() * tagsPool.length)]);
      }
      // Add a primary tag based on name
      if (
        taskName.toLowerCase().includes("work") ||
        taskName.toLowerCase().includes("project") ||
        taskName.toLowerCase().includes("client") ||
        taskName.toLowerCase().includes("meeting")
      )
        taskTags.push("work");
      if (
        taskName.toLowerCase().includes("personal") ||
        taskName.toLowerCase().includes("health") ||
        taskName.toLowerCase().includes("gym")
      )
        taskTags.push("personal");

      const task: Task = {
        id: `task-${dayOffset + 5}-${taskIdCounter++}`, // More unique ID
        name:
          taskName +
          (Math.random() < 0.1
            ? " - And some extra details to make the name even longer just for testing purposes to see how text wrapping and clipping might behave in the UI, especially on smaller screens or within constrained widget sizes."
            : ""),
        scheduled: {
          start: effectiveStartTime,
          end: endTime,
        },
        status,
        tags: [...new Set(taskTags)], // Unique tags
      };

      // Add actual times for some past tasks
      if (
        effectiveStartTime < new Date() &&
        (status === "completed" || status === "in-progress") &&
        Math.random() < 0.7
      ) {
        const actualStartOffset = (Math.random() - 0.5) * 30; // -15 to +15 mins
        const actualDurationOffset = (Math.random() - 0.3) * 30; // -9 to +21 mins
        task.actual = {
          start: addMinutes(task.scheduled.start, actualStartOffset),
          end: addMinutes(task.scheduled.end, actualDurationOffset),
        };
        // ensure actual end is after actual start
        if (task.actual.end < task.actual.start) {
          task.actual.end = addMinutes(
            task.actual.start,
            durationMinutes + actualDurationOffset,
          );
        }
      }

      // Make one task per day an "anchor"
      if (i === 0 && dayOffset >= -1 && dayOffset <= 1) {
        // Anchor for yesterday, today, tomorrow
        task.isAnchor = true;
        task.name = `⚓ Daily Anchor: ${task.name}`;
      }

      tasks.push(task);

      // Add a small, overlapping "interruption" task occasionally
      if (Math.random() < 0.2) {
        // 20% chance
        const interruptionStart = addMinutes(
          task.scheduled.start,
          Math.floor(durationMinutes / 3),
        );
        const interruptionDuration = Math.floor(Math.random() * 20) + 5; // 5-25 mins
        const interruptionEnd = addMinutes(
          interruptionStart,
          interruptionDuration,
        );
        if (interruptionEnd < task.scheduled.end) {
          // ensure it's within the parent task
          tasks.push({
            id: `task-int-${dayOffset + 5}-${taskIdCounter++}`,
            name: "Quick Interruption / Call",
            scheduled: {
              start: interruptionStart,
              end: interruptionEnd,
            },
            status: Math.random() > 0.5 ? "completed" : "scheduled",
            tags: ["interruption", "quick"],
            notes: "This was an unexpected interruption.",
          });
        }
      }
    }
  }

  // Sort tasks by start date just in case generation order wasn't perfect
  tasks.sort(
    (a, b) => a.scheduled.start.getTime() - b.scheduled.start.getTime(),
  );

  // Ensure we have around 50 tasks by adding or removing some if needed (simple way)
  const desiredTaskCount = 50;
  if (tasks.length > desiredTaskCount) {
    tasks.splice(desiredTaskCount);
  } else {
    while (tasks.length < desiredTaskCount) {
      // Add a generic future task
      const futureDay = Math.floor(Math.random() * 3) + 3; // 3-5 days in future
      const baseDate = new Date(today);
      baseDate.setDate(today.getDate() + futureDay);
      const startTime = generateRandomTime(baseDate, 9, 17);
      const endTime = addMinutes(
        startTime,
        Math.floor(Math.random() * 60) + 30,
      );
      tasks.push({
        id: `filler-task-${taskIdCounter++}`,
        name: "Generic Future Task",
        scheduled: { start: startTime, end: endTime },
        status: "scheduled",
        tags: ["filler"],
      });
    }
  }

  console.log(`Generated ${tasks.length} sample tasks.`);
  return tasks;
};
