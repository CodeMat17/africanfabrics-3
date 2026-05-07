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
    const all = await ctx.db.query("staff").take(200);
    const active = all.filter((s) => s.isActive);
    const primary = active.filter((s) => s.role === args.role);
    const secondary = active.filter(
      (s) => s.role !== args.role && s.secondaryRoles?.includes(args.role)
    );
    return [...primary, ...secondary];
  },
});

export const listAvailable = query({
  args: { role: roleValidator },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("staff").take(200);
    const active = all.filter((s) => s.isActive && !s.isBusy);
    const primary = active.filter((s) => s.role === args.role);
    const secondary = active.filter(
      (s) => s.role !== args.role && s.secondaryRoles?.includes(args.role)
    );
    return [...primary, ...secondary];
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
