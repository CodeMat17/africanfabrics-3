import { mutation } from "./_generated/server";
import { v } from "convex/values";

const femaleMeasurementsValidator = v.object({
  bust: v.optional(v.string()),
  waist: v.optional(v.string()),
  hips: v.optional(v.string()),
  shoulders: v.optional(v.string()),
  sleeveLength: v.optional(v.string()),
  topLength: v.optional(v.string()),
  skirtLength: v.optional(v.string()),
  thigh: v.optional(v.string()),
  neck: v.optional(v.string()),
  overBust: v.optional(v.string()),
  underBust: v.optional(v.string()),
  neckToHeel: v.optional(v.string()),
  neckToAboveKnee: v.optional(v.string()),
  armLength: v.optional(v.string()),
  shoulderSeam: v.optional(v.string()),
  armHole: v.optional(v.string()),
  foreArm: v.optional(v.string()),
  vNeckCut: v.optional(v.string()),
  aboveKneeToAnkle: v.optional(v.string()),
  waistToAboveKnee: v.optional(v.string()),
  blouseLength: v.optional(v.string()),
});

const maleMeasurementsValidator = v.object({
  chest: v.optional(v.string()),
  chestAtAmpits: v.optional(v.string()),
  waist: v.optional(v.string()),
  hips: v.optional(v.string()),
  shoulder: v.optional(v.string()),
  sleeveLength: v.optional(v.string()),
  topLength: v.optional(v.string()),
  trouserWaist: v.optional(v.string()),
  trouserLength: v.optional(v.string()),
  thigh: v.optional(v.string()),
  calf: v.optional(v.string()),
  forehead: v.optional(v.string()),
  forearm: v.optional(v.string()),
  wrist: v.optional(v.string()),
  torsoCircum: v.optional(v.string()),
  pantsLength: v.optional(v.string()),
  thighAtCrotch: v.optional(v.string()),
  midThigh: v.optional(v.string()),
  knee: v.optional(v.string()),
  belowKnee: v.optional(v.string()),
  ankle: v.optional(v.string()),
  biceps: v.optional(v.string()),
  elbow: v.optional(v.string()),
  shoulders: v.optional(v.string()),
  neck: v.optional(v.string()),
});

const orderRowValidator = v.object({
  clientName: v.string(),
  phone: v.string(),
  email: v.string(),
  garmentType: v.string(),
  gender: v.union(v.literal("male"), v.literal("female")),
  collectionDate: v.number(),
  specialInstructions: v.optional(v.string()),
  femaleMeasurements: v.optional(femaleMeasurementsValidator),
  maleMeasurements: v.optional(maleMeasurementsValidator),
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("ready_for_qc"),
    v.literal("completed"),
    v.literal("collected")
  ),
  workflowStage: v.union(
    v.literal("unassigned"),
    v.literal("tailoring"),
    v.literal("beading"),
    v.literal("fitting"),
    v.literal("qc"),
    v.literal("done")
  ),
  completedAt: v.optional(v.number()),
  collectedAt: v.optional(v.number()),
});

// Called once per batch from the import script via `npx convex run`.
export const bulkImport = mutation({
  args: {
    rows: v.array(orderRowValidator),
  },
  handler: async (ctx, { rows }) => {
    // Find the highest existing order number so we don't collide.
    const latest = await ctx.db.query("orders").order("desc").take(1);
    let nextNum =
      latest.length === 0
        ? 1
        : parseInt(latest[0].orderNumber.split("-")[1], 10) + 1;

    const inserted: string[] = [];

    for (const row of rows) {
      const nameParts = row.clientName.trim().split(/\s+/);
      const nameSlug = nameParts
        .slice(0, 2)
        .map((p) => p.slice(0, 3).toUpperCase())
        .join("-");
      const orderNumber = `ORD-${String(nextNum).padStart(4, "0")}-${nameSlug}`;
      nextNum++;

      const id = await ctx.db.insert("orders", {
        ...row,
        orderNumber,
      });
      inserted.push(id);
    }

    return { inserted: inserted.length };
  },
});
