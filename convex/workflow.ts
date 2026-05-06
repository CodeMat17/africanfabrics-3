import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const workflowStageValidator = v.union(
  v.literal("unassigned"),
  v.literal("tailoring"),
  v.literal("beading"),
  v.literal("fitting"),
  v.literal("qc"),
  v.literal("done")
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const getEventsByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowEvents")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .order("asc")
      .take(200);
  },
});

export const getEventsByStaff = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowEvents")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .order("desc")
      .take(100);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

// Assign a staff member to an order for a given stage and advance the workflow
export const assignStaff = mutation({
  args: {
    orderId: v.id("orders"),
    staffId: v.id("staff"),
    stage: v.union(
      v.literal("tailoring"),
      v.literal("beading"),
      v.literal("fitting"),
      v.literal("qc")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");
    if (!staff.isActive) throw new Error("Staff member is not active");
    if (staff.isBusy) throw new Error("Staff member is already busy");

    const stageToField: Record<string, keyof typeof order> = {
      tailoring: "assignedTailorId",
      beading: "assignedBeaderId",
      fitting: "assignedFitterId",
      qc: "assignedQCId",
    };

    const orderPatch: Record<string, unknown> = {
      workflowStage: args.stage,
      status: "in_progress",
      [stageToField[args.stage]]: args.staffId,
    };
    if (args.stage === "qc") orderPatch.status = "ready_for_qc";

    await ctx.db.patch(args.orderId, orderPatch);
    await ctx.db.patch(args.staffId, {
      isBusy: true,
      assignedOrderId: args.orderId,
    });

    await ctx.db.insert("workflowEvents", {
      orderId: args.orderId,
      fromStage: order.workflowStage,
      toStage: args.stage,
      staffId: args.staffId,
      note: args.note,
      occurredAt: Date.now(),
    });
  },
});

// Advance an order to the next stage and free the current staff member
export const advanceStage = mutation({
  args: {
    orderId: v.id("orders"),
    toStage: workflowStageValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Determine which staff field corresponds to the current stage so we can free them
    const stageToAssignedField: Partial<Record<string, Id<"staff"> | undefined>> = {
      tailoring: order.assignedTailorId,
      beading: order.assignedBeaderId,
      fitting: order.assignedFitterId,
      qc: order.assignedQCId,
    };

    const currentStaffId = stageToAssignedField[order.workflowStage];
    if (currentStaffId) {
      await ctx.db.patch(currentStaffId, {
        isBusy: false,
        assignedOrderId: undefined,
      });
    }

    const statusMap: Record<string, "in_progress" | "ready_for_qc" | "completed" | "pending"> = {
      tailoring: "in_progress",
      beading: "in_progress",
      fitting: "in_progress",
      qc: "ready_for_qc",
      done: "completed",
    };

    const patch: Record<string, unknown> = {
      workflowStage: args.toStage,
      status: statusMap[args.toStage] ?? "in_progress",
    };
    if (args.toStage === "done") patch.completedAt = Date.now();

    await ctx.db.patch(args.orderId, patch);

    await ctx.db.insert("workflowEvents", {
      orderId: args.orderId,
      fromStage: order.workflowStage,
      toStage: args.toStage,
      note: args.note,
      occurredAt: Date.now(),
    });
  },
});

// Mark an order as collected by the client
export const markCollected = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "completed")
      throw new Error("Order must be completed before collection");

    await ctx.db.patch(args.orderId, {
      status: "collected",
      collectedAt: Date.now(),
    });

    await ctx.db.insert("workflowEvents", {
      orderId: args.orderId,
      fromStage: order.workflowStage,
      toStage: "done",
      note: "Order collected by client",
      occurredAt: Date.now(),
    });
  },
});

// Unassign a staff member from an order (e.g. reassignment)
export const unassignStaff = mutation({
  args: {
    orderId: v.id("orders"),
    staffId: v.id("staff"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");

    await ctx.db.patch(args.staffId, {
      isBusy: false,
      assignedOrderId: undefined,
    });

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.insert("workflowEvents", {
      orderId: args.orderId,
      fromStage: order.workflowStage,
      toStage: order.workflowStage,
      staffId: args.staffId,
      note: args.note ?? "Staff unassigned",
      occurredAt: Date.now(),
    });
  },
});
