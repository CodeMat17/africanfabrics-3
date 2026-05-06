"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format, isBefore, addDays } from "date-fns";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function DashboardPage() {
  const orders = useQuery(api.orders.listAll);
  const today = new Date();

  if (orders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    due: orders.filter(
      (o) =>
        o.status !== "collected" &&
        o.status !== "completed" &&
        isBefore(new Date(o.collectionDate), addDays(today, 4))
    ).length,
    completed: orders.filter((o) => o.status === "completed").length,
    collected: orders.filter((o) => o.status === "collected").length,
    inProgress: orders.filter(
      (o) => o.status === "in_progress" || o.status === "ready_for_qc"
    ).length,
  };

  const cards = [
    {
      title: "Total Orders",
      value: stats.total,
      icon: ClipboardList,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/dashboard/orders",
    },
    {
      title: "Pending Orders",
      value: stats.pending,
      icon: ShoppingBag,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/dashboard/workflow",
    },
    {
      title: "Due Orders",
      value: stats.due,
      icon: Clock,
      color: "text-destructive",
      bg: "bg-destructive/10",
      href: "/dashboard/due-orders",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
      href: "/dashboard/workflow",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-accent",
      bg: "bg-accent/10",
      href: "/dashboard/orders",
    },
    {
      title: "Collected",
      value: stats.collected,
      icon: PackageCheck,
      color: "text-accent",
      bg: "bg-accent/15",
      href: "/dashboard/orders",
    },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    pending: "bg-primary/15 text-primary dark:bg-primary/20",
    in_progress: "bg-accent/15 text-accent dark:bg-accent/20",
    ready_for_qc: "bg-primary/10 text-primary/80 dark:bg-primary/15",
    completed: "bg-accent/20 text-accent dark:bg-accent/25",
    collected: "bg-accent/10 text-accent/80 dark:bg-accent/15",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    ready_for_qc: "QC Check",
    completed: "Completed",
    collected: "Collected",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back — here&apos;s your atelier at a glance.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Link href={card.href} aria-label={`${card.title}: ${card.value}`}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {card.title}
                      </p>
                      <p className="text-3xl font-bold mt-1 tracking-tight">
                        {card.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${card.bg}`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
              <Link href="/dashboard/orders">
                View all <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No orders yet
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {recentOrders.map((order, idx) => (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {order.clientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.garmentType} &middot; Due{" "}
                          {format(new Date(order.collectionDate), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status]}`}
                      >
                        {statusLabel[order.status]}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:block font-mono">
                        {order.orderNumber}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
