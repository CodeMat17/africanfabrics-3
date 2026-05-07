"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";
import DueOrdersLoading from "./loading";
import { format, differenceInDays } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";

type Order = Omit<Doc<"orders">, "maleMeasurements" | "femaleMeasurements">;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } },
};

function DueOrderRow({ order }: { order: Order }) {
  const today = new Date();
  const collectionDate = new Date(order.collectionDate);
  const days = differenceInDays(collectionDate, today);

  const urgencyColor =
    days < 0
      ? "border-l-red-500"
      : days === 0
      ? "border-l-orange-500"
      : days === 1
      ? "border-l-amber-500"
      : "border-l-yellow-400";

  const stageBadge: Record<string, string> = {
    unassigned: "bg-gray-100 text-gray-600",
    tailoring: "bg-blue-100 text-blue-700",
    beading: "bg-purple-100 text-purple-700",
    fitting: "bg-indigo-100 text-indigo-700",
    qc: "bg-pink-100 text-pink-700",
    done: "bg-green-100 text-green-700",
  };

  return (
    <motion.div variants={item}>
      <Card
        className={`border-l-4 ${urgencyColor} border-border/60 hover:shadow-md transition-all duration-200`}
      >
        <CardContent className="py-4 px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {order.clientName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{order.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {order.garmentType} &middot; {order.orderNumber}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stageBadge[order.workflowStage] || "bg-muted text-muted-foreground"
                }`}
              >
                {order.workflowStage.charAt(0).toUpperCase() +
                  order.workflowStage.slice(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(collectionDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DueOrdersPage() {
  const orders = useQuery(api.orders.listActiveSummaries);
  const today = new Date();

  if (orders === undefined) return <DueOrdersLoading />;

  const active = orders.filter(
    (o) => o.status !== "collected" && o.status !== "completed"
  );

  const overdue = active.filter(
    (o) => differenceInDays(new Date(o.collectionDate), today) < 0
  );
  const dueToday = active.filter(
    (o) => differenceInDays(new Date(o.collectionDate), today) === 0
  );
  const dueTomorrow = active.filter(
    (o) => differenceInDays(new Date(o.collectionDate), today) === 1
  );
  const dueIn2Days = active.filter(
    (o) => differenceInDays(new Date(o.collectionDate), today) === 2
  );
  const dueIn3Days = active.filter(
    (o) => differenceInDays(new Date(o.collectionDate), today) === 3
  );

  const sections = [
    {
      title: "Overdue",
      orders: overdue,
      icon: AlertTriangle,
      iconColor: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/20",
      emptyMsg: "No overdue orders",
    },
    {
      title: "Due Today",
      orders: dueToday,
      icon: Clock,
      iconColor: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      emptyMsg: "Nothing due today",
    },
    {
      title: "Due Tomorrow",
      orders: dueTomorrow,
      icon: CalendarClock,
      iconColor: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      emptyMsg: "Nothing due tomorrow",
    },
    {
      title: "Due in 2 Days",
      orders: dueIn2Days,
      icon: CalendarClock,
      iconColor: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      emptyMsg: "Nothing due in 2 days",
    },
    {
      title: "Due in 3 Days",
      orders: dueIn3Days,
      icon: CalendarClock,
      iconColor: "text-lime-600",
      bg: "bg-lime-50 dark:bg-lime-950/20",
      emptyMsg: "Nothing due in 3 days",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Due Orders</h1>
        <p className="text-muted-foreground mt-1">
          Track upcoming and overdue collection deadlines
        </p>
      </motion.div>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Overdue", count: overdue.length, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Due Today", count: dueToday.length, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Tomorrow", count: dueTomorrow.length, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Next 3 Days", count: dueIn2Days.length + dueIn3Days.length, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-xl p-4 flex flex-col items-center`}
          >
            <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Sections */}
      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + si * 0.05 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${section.bg}`}>
              <section.icon size={16} className={section.iconColor} />
            </div>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
              {section.orders.length}
            </span>
          </div>

          {section.orders.length === 0 ? (
            <div className="border border-dashed rounded-xl py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-green-400" />
              {section.emptyMsg}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {section.orders.map((order) => (
                <DueOrderRow key={order._id} order={order} />
              ))}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
