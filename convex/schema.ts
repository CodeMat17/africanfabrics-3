import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const maleMeasurements = v.object({
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

const femaleMeasurements = v.object({
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

export default defineSchema({
  orders: defineTable({
    orderNumber: v.string(),
    clientName: v.string(),
    phone: v.string(),
    email: v.string(),
    garmentType: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    collectionDate: v.number(),
    fabricPhotoStorageId: v.optional(v.id("_storage")),
    specialInstructions: v.optional(v.string()),
    maleMeasurements: v.optional(maleMeasurements),
    femaleMeasurements: v.optional(femaleMeasurements),
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
    assignedTailorId: v.optional(v.id("staff")),
    assignedBeaderId: v.optional(v.id("staff")),
    assignedFitterId: v.optional(v.id("staff")),
    assignedQCId: v.optional(v.id("staff")),
    completedAt: v.optional(v.number()),
    collectedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_workflow_stage", ["workflowStage"])
    .index("by_collection_date", ["collectionDate"])
    .index("by_order_number", ["orderNumber"]),

  staff: defineTable({
    name: v.string(),
    role: v.union(
      v.literal("tailor"),
      v.literal("beader"),
      v.literal("fitter"),
      v.literal("qc")
    ),
    secondaryRoles: v.optional(v.array(v.union(
      v.literal("tailor"),
      v.literal("beader"),
      v.literal("fitter"),
      v.literal("qc")
    ))),
    isBusy: v.boolean(),
    assignedOrderId: v.optional(v.id("orders")),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_role", ["role"])
    .index("by_busy", ["isBusy"])
    .index("by_role_and_busy", ["role", "isBusy"]),

  workflowEvents: defineTable({
    orderId: v.id("orders"),
    fromStage: v.optional(
      v.union(
        v.literal("unassigned"),
        v.literal("tailoring"),
        v.literal("beading"),
        v.literal("fitting"),
        v.literal("qc"),
        v.literal("done")
      )
    ),
    toStage: v.union(
      v.literal("unassigned"),
      v.literal("tailoring"),
      v.literal("beading"),
      v.literal("fitting"),
      v.literal("qc"),
      v.literal("done")
    ),
    staffId: v.optional(v.id("staff")),
    note: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_staff", ["staffId"]),
});
