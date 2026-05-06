import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("tailor"),
  v.literal("beader"),
  v.literal("fitter"),
  v.literal("qc")
);

// ── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("staff").take(200);
    if (args.includeInactive) return all;
    return all.filter((s) => s.isActive);
  },
});

export const getById = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.staffId);
  },
});

export const listByRole = query({
  args: { role: roleValidator },
  handler: async (ctx, args) => {
    const primary = await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(100);

    const all = await ctx.db.query("staff").take(200);
    const secondary = all.filter(
      (s) =>
        s.isActive &&
        s.role !== args.role &&
        s.secondaryRoles?.includes(args.role)
    );

    const seen = new Set(primary.map((s) => s._id));
    return [...primary, ...secondary.filter((s) => !seen.has(s._id))];
  },
});

export const listAvailable = query({
  args: { role: roleValidator },
  handler: async (ctx, args) => {
    const primary = await ctx.db
      .query("staff")
      .withIndex("by_role_and_busy", (q) =>
        q.eq("role", args.role).eq("isBusy", false)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(100);

    const all = await ctx.db.query("staff").take(200);
    const secondary = all.filter(
      (s) =>
        s.isActive &&
        !s.isBusy &&
        s.role !== args.role &&
        s.secondaryRoles?.includes(args.role)
    );

    const seen = new Set(primary.map((s) => s._id));
    return [...primary, ...secondary.filter((s) => !seen.has(s._id))];
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    role: roleValidator,
    secondaryRoles: v.optional(v.array(roleValidator)),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staff", {
      ...args,
      isBusy: false,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(roleValidator),
    secondaryRoles: v.optional(v.array(roleValidator)),
  },
  handler: async (ctx, args) => {
    const { staffId, ...fields } = args;
    await ctx.db.patch(staffId, fields);
  },
});

export const deactivate = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.staffId, { isActive: false });
  },
});

export const reactivate = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.staffId, { isActive: true });
  },
});
