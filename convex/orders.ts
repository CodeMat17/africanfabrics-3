import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

const maleMeasurementsValidator = v.object({
  chest: v.optional(v.string()),
  chestAtAmpits: v.optional(v.string()),
  waist: v.optional(v.string()),
  hips: v.optional(v.string()),
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

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const getById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("ready_for_qc"),
      v.literal("completed"),
      v.literal("collected")
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listByWorkflowStage = query({
  args: {
    workflowStage: v.union(
      v.literal("unassigned"),
      v.literal("tailoring"),
      v.literal("beading"),
      v.literal("fitting"),
      v.literal("qc"),
      v.literal("done")
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_workflow_stage", (q) => q.eq("workflowStage", args.workflowStage))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listByCollectionDate = query({
  args: {
    from: v.number(),
    to: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_collection_date", (q) =>
        q.gte("collectionDate", args.from).lte("collectionDate", args.to)
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientName: v.string(),
    phone: v.string(),
    email: v.string(),
    garmentType: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    collectionDate: v.number(),
    fabricPhotoStorageId: v.optional(v.id("_storage")),
    specialInstructions: v.optional(v.string()),
    maleMeasurements: v.optional(maleMeasurementsValidator),
    femaleMeasurements: v.optional(femaleMeasurementsValidator),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db.query("orders").order("desc").take(1);
    const nextNum = latest.length === 0
      ? 1
      : parseInt(latest[0].orderNumber.split("-")[1], 10) + 1;
    const nameParts = args.clientName.trim().split(/\s+/);
    const nameSlug = nameParts
      .slice(0, 2)
      .map((p) => p.slice(0, 3).toUpperCase())
      .join("-");
    const orderNumber = `ORD-${String(nextNum).padStart(4, "0")}-${nameSlug}`;

    return await ctx.db.insert("orders", {
      ...args,
      orderNumber,
      status: "pending",
      workflowStage: "unassigned",
    });
  },
});

export const updateMeasurements = mutation({
  args: {
    orderId: v.id("orders"),
    maleMeasurements: v.optional(maleMeasurementsValidator),
    femaleMeasurements: v.optional(femaleMeasurementsValidator),
  },
  handler: async (ctx, args) => {
    const { orderId, ...fields } = args;
    await ctx.db.patch(args.orderId, fields);
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("ready_for_qc"),
      v.literal("completed"),
      v.literal("collected")
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "completed") patch.completedAt = Date.now();
    if (args.status === "collected") patch.collectedAt = Date.now();
    await ctx.db.patch(args.orderId, patch);
  },
});

export const updateDetails = mutation({
  args: {
    orderId: v.id("orders"),
    clientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    garmentType: v.optional(v.string()),
    collectionDate: v.optional(v.number()),
    fabricPhotoStorageId: v.optional(v.id("_storage")),
    specialInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, ...fields } = args;
    await ctx.db.patch(orderId, fields);
  },
});

export const remove = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const role = (identity as { role?: string }).role ??
      (identity.customClaims?.role as string | undefined);
    if (role !== "admin") throw new Error("Only admins can delete orders");

    await ctx.db.delete(args.orderId);
  },
});

export const getFabricPhotoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
