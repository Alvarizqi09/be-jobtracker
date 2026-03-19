import cron from "node-cron";
import { JobModel } from "../models/Job";
import { ContactModel } from "../models/Contact";
import { NotificationModel } from "../models/Notification";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";

export function startCronJobs() {
  // Run every day at 08:00 AM server time
  cron.schedule("0 8 * * *", async () => {
    console.log("Running daily notification generation job...");
    try {
      await generateDailyNotifications();
      console.log("Daily notification generation completed.");
    } catch (error) {
      console.error("Error generating daily notifications:", error);
    }
  });
}

export async function generateDailyNotifications() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const inThreeDaysStart = startOfDay(addDays(new Date(), 3));
  const inThreeDaysEnd = endOfDay(addDays(new Date(), 3));

  // 1. Deadline Approaching (within 3 days)
  const jobsWithDeadline = await JobModel.find({
    status: { $nin: ["rejected", "offer"] },
    deadline: { $gte: todayStart, $lte: inThreeDaysEnd },
  }).lean();

  for (const job of jobsWithDeadline) {
    if (!job.deadline) continue;
    const isToday = job.deadline >= todayStart && job.deadline <= todayEnd;
    
    // Check if notification already exists for this job today
    const exists = await NotificationModel.exists({
      userId: job.userId,
      jobId: String(job._id),
      type: "deadline_approaching",
      triggerDate: { $gte: todayStart, $lte: todayEnd },
    });

    if (!exists) {
      await NotificationModel.create({
        userId: job.userId,
        type: "deadline_approaching",
        title: isToday ? "Deadline is Today!" : "Deadline Approaching",
        message: `The deadline for ${job.position} at ${job.company} is ${isToday ? "today" : "approaching"}.`,
        jobId: String(job._id),
        triggerDate: new Date(),
      });
    }
  }

  // 2. Offer Expiring (within 3 days)
  const offersExpiring = await JobModel.find({
    status: "offer",
    "offerDetails.offerDeadline": { $gte: todayStart, $lte: inThreeDaysEnd },
  }).lean();

  for (const job of offersExpiring) {
    if (!job.offerDetails?.offerDeadline) continue;
    const isToday =
      job.offerDetails.offerDeadline >= todayStart &&
      job.offerDetails.offerDeadline <= todayEnd;

    const exists = await NotificationModel.exists({
      userId: job.userId,
      jobId: String(job._id),
      type: "offer_expiring",
      triggerDate: { $gte: todayStart, $lte: todayEnd },
    });

    if (!exists) {
      await NotificationModel.create({
        userId: job.userId,
        type: "offer_expiring",
        title: isToday ? "Offer Expires Today!" : "Offer Expiring Soon",
        message: `Your offer for ${job.position} at ${job.company} expires ${isToday ? "today" : "soon"}.`,
        jobId: String(job._id),
        triggerDate: new Date(),
      });
    }
  }

  // 3. Stale Application (> 14 days and still 'applied')
  // We check jobs applied exactly 14, 21, or 28 days ago to avoid spamming every day.
  const intervals = [14, 21, 28];
  for (const days of intervals) {
    const targetDateStart = startOfDay(subDays(new Date(), days));
    const targetDateEnd = endOfDay(subDays(new Date(), days));

    const staleJobs = await JobModel.find({
      status: "applied",
      appliedDate: { $gte: targetDateStart, $lte: targetDateEnd },
    }).lean();

    for (const job of staleJobs) {
      const exists = await NotificationModel.exists({
        userId: job.userId,
        jobId: String(job._id),
        type: "stale_application",
        triggerDate: { $gte: todayStart, $lte: todayEnd },
      });

      if (!exists) {
        await NotificationModel.create({
          userId: job.userId,
          type: "stale_application",
          title: "Stale Application",
          message: `It's been ${days} days since you applied for ${job.position} at ${job.company}. Consider following up!`,
          jobId: String(job._id),
          triggerDate: new Date(),
        });
      }
    }
  }

  // 4. Follow-up Reminders
  const contactsToFollowUp = await ContactModel.find({
    followUpDate: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  for (const contact of contactsToFollowUp) {
    const exists = await NotificationModel.exists({
      userId: contact.userId,
      contactId: String(contact._id),
      type: "follow_up_reminder",
      triggerDate: { $gte: todayStart, $lte: todayEnd },
    });

    if (!exists) {
      await NotificationModel.create({
        userId: contact.userId,
        type: "follow_up_reminder",
        title: "Follow-up Reminder",
        message: `Time to follow up with ${contact.name} (${contact.role} at ${contact.company}).`,
        contactId: String(contact._id),
        triggerDate: new Date(),
      });
    }
  }
}
