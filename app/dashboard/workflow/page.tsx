"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Sparkles,
  Ruler,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  CircleDot,
  PackageCheck,
  GitBranch,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
type WorkflowStage = "unassigned" | "tailoring" | "beading" | "fitting" | "qc" | "done";
type StaffRole = "tailor" | "beader" | "fitter" | "qc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Order = Doc<"orders">;
type Staff = Doc<"staff">;

const STAGES: {
  stage: WorkflowStage;
  label: string;
  role?: StaffRole;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { stage: "unassigned", label: "Unassigned", icon: GitBranch, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  { stage: "tailoring", label: "Tailoring", role: "tailor", icon: Scissors, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { stage: "beading", label: "Beading", role: "beader", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { stage: "fitting", label: "Fitting", role: "fitter", icon: Ruler, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { stage: "qc", label: "QC Check", role: "qc", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
];

const ROLE_LABELS: Record<StaffRole, string> = {
  tailor: "Tailor",
  beader: "Beader",
  fitter: "Fitter",
  qc: "Quality Control",
};

const ROLE_TO_STAGE: Record<StaffRole, "tailoring" | "beading" | "fitting" | "qc"> = {
  tailor: "tailoring",
  beader: "beading",
  fitter: "fitting",
  qc: "qc",
};

const NEXT_STAGE: Record<WorkflowStage, WorkflowStage> = {
  unassigned: "tailoring",
  tailoring: "beading",
  beading: "fitting",
  fitting: "qc",
  qc: "done",
  done: "done",
};

function StaffSelector({
  role,
  staff,
  selectedId,
  onSelect,
}: {
  role: StaffRole;
  staff: Staff[];
  selectedId?: Id<"staff">;
  onSelect: (id: Id<"staff">) => void;
}) {
  const eligible = staff.filter((s) => s.role === role && s.isActive);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Assign {ROLE_LABELS[role]}:
      </p>
      <div className="grid grid-cols-1 gap-2">
        {eligible.map((member) => {
          const isSelected = member._id === selectedId;
          const isBusyElsewhere = member.isBusy && member.assignedOrderId && member._id !== selectedId;

          return (
            <button
              key={member._id}
              disabled={!!isBusyElsewhere}
              onClick={() => !isBusyElsewhere && onSelect(member._id)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : isBusyElsewhere
                  ? "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isBusyElsewhere ? "text-muted-foreground" : ""}`}>
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBusyElsewhere ? "Busy" : "Available"}
                </p>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  member.isBusy && member._id !== selectedId
                    ? "bg-red-400"
                    : isSelected
                    ? "bg-primary"
                    : "bg-green-400"
                }`}
              />
              {isSelected && (
                <Check size={14} className="text-primary shrink-0" />
              )}
            </button>
          );
        })}
        {eligible.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active {ROLE_LABELS[role].toLowerCase()}s found
          </p>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({ order, staff }: { order: Order; staff: Staff[] }) {
  const assignStaff = useMutation(api.workflow.assignStaff);
  const advanceStage = useMutation(api.workflow.advanceStage);

  const [open, setOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Id<"staff"> | undefined>();

  const currentStageConfig = STAGES.find((s) => s.stage === order.workflowStage);
  const stageIndex = STAGES.findIndex((s) => s.stage === order.workflowStage);

  const getNextRole = (): StaffRole | null => {
    const map: Record<WorkflowStage, StaffRole | null> = {
      unassigned: "tailor",
      tailoring: "beader",
      beading: "fitter",
      fitting: "qc",
      qc: null,
      done: null,
    };
    return map[order.workflowStage];
  };

  const getCurrentAssignedStaffId = (): Id<"staff"> | undefined => {
    const map: Record<WorkflowStage, Id<"staff"> | undefined> = {
      unassigned: undefined,
      tailoring: order.assignedTailorId,
      beading: order.assignedBeaderId,
      fitting: order.assignedFitterId,
      qc: order.assignedQCId,
      done: undefined,
    };
    return map[order.workflowStage];
  };

  const currentRole = getNextRole();
  const assignedStaffId = getCurrentAssignedStaffId();
  const assignedStaffName = staff.find((s) => s._id === assignedStaffId)?.name;

  const isDone = order.workflowStage === "done";

  const handleOpenAssign = () => {
    setSelectedStaff(assignedStaffId);
    setOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedStaff || !currentRole) return;
    await assignStaff({
      orderId: order._id,
      staffId: selectedStaff,
      stage: ROLE_TO_STAGE[currentRole],
    });
    setOpen(false);
  };

  const handleMarkDone = async () => {
    const toStage = NEXT_STAGE[order.workflowStage];
    await advanceStage({ orderId: order._id, toStage });
  };

  if (isDone) return null;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <Card className="border-border/60 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
              
                <div>
                  <h3 className="font-semibold text-sm">{order.clientName}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {order.orderNumber} &middot; {order.garmentType}
                  </p>
                </div>
              </div>
              {currentStageConfig && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${currentStageConfig.bg}`}>
                  <currentStageConfig.icon size={13} className={currentStageConfig.color} />
                  <span className={`text-xs font-medium ${currentStageConfig.color}`}>
                    {currentStageConfig.label}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {/* Progress pipeline */}
            <div className="flex items-center gap-1">
              {STAGES.slice(1).map((s, i) => {
                const isCompleted = stageIndex > STAGES.indexOf(s);
                const isCurrent = s.stage === order.workflowStage;
                return (
                  <div key={s.stage} className="flex items-center gap-1 flex-1">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        isCompleted
                          ? "bg-primary"
                          : isCurrent
                          ? "bg-primary/40"
                          : "bg-border"
                      }`}
                    />
                    {i === STAGES.slice(1).length - 1 && (
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          isCompleted ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Due date */}
            <p className="text-xs text-muted-foreground">
              Due:{" "}
              <span className="font-medium text-foreground">
                {format(new Date(order.collectionDate), "MMM d, yyyy")}
              </span>
            </p>

            {/* Current assignment info */}
            {assignedStaffName && (
              <div className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
                <CircleDot size={12} className="text-primary" />
                <span className="text-muted-foreground">Assigned to</span>
                <span className="font-medium">{assignedStaffName}</span>
              </div>
            )}

            {/* View details link */}
            <Link
              href={`/dashboard/orders/${order._id}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink size={12} />
              View full order &amp; measurements
            </Link>

            {/* Actions */}
            <div className="flex gap-2">
              {order.workflowStage === "unassigned" ? (
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={handleOpenAssign}
                >
                  <Scissors size={14} />
                  Assign Tailor
                </Button>
              ) : order.workflowStage !== "done" ? (
                <>
                  {currentRole && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={handleOpenAssign}
                    >
                      <ChevronRight size={14} />
                      {assignedStaffId ? "Reassign" : `Assign ${ROLE_LABELS[currentRole]}`}
                    </Button>
                  )}
                  {assignedStaffId && (
                    <Button
                      size="sm"
                      className={`flex-1 gap-1.5 ${
                        order.workflowStage === "qc"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : ""
                      }`}
                      onClick={handleMarkDone}
                    >
                      {order.workflowStage === "qc" ? (
                        <>
                          <PackageCheck size={14} />
                          QC Passed
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Mark Done
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Assign dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-4 my-8 max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Assign {currentRole ? ROLE_LABELS[currentRole] : "Staff"}
            </DialogTitle>
            <DialogDescription>
              Select a staff member for <strong>{order.orderNumber}</strong> —{" "}
              {order.clientName}. Busy staff are disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-2 pr-1">
            {currentRole && (
              <StaffSelector
                role={currentRole}
                staff={staff}
                selectedId={selectedStaff}
                onSelect={setSelectedStaff}
              />
            )}
          </div>

          <div className="flex gap-3 justify-end mt-2 shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedStaff}>
              Confirm Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PAGE_SIZE = 20;

function StagePagination({
  orders,
  page,
  onPage,
}: {
  orders: Order[];
  page: number;
  onPage: (p: number) => void;
}) {
  const total = Math.ceil(orders.length / PAGE_SIZE);
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
      <button
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft size={13} /> Prev
      </button>
      <span>
        {page + 1} / {total}
      </span>
      <button
        disabled={page >= total - 1}
        onClick={() => onPage(page + 1)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Next <ChevronRight size={13} />
      </button>
    </div>
  );
}

export default function WorkflowPage() {
  const orders = useQuery(api.orders.listAll);
  const staff = useQuery(api.staff.list, {});
  const [stagePages, setStagePages] = useState<Record<string, number>>({});

  if (orders === undefined || staff === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== "collected" && o.workflowStage !== "done"
  );

  const byStage = STAGES.map((s) => ({
    ...s,
    orders: activeOrders.filter((o) => o.workflowStage === s.stage),
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Workflow</h1>
        <p className="text-muted-foreground mt-1">
          Assign and track each order through the production pipeline
        </p>
      </motion.div>

      {/* Pipeline visual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 overflow-x-auto pb-2"
      >
        {STAGES.map((stage, i) => {
          const count = activeOrders.filter(
            (o) => o.workflowStage === stage.stage
          ).length;
          const Icon = stage.icon;
          return (
            <div key={stage.stage} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${stage.bg}`}>
                <Icon size={15} className={stage.color} />
                <span className={`text-xs font-semibold ${stage.color}`}>
                  {stage.label}
                </span>
                <span
                  className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${stage.bg} ${stage.color} border ${stage.color.replace("text-", "border-")}`}
                >
                  {count}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <ChevronRight size={14} className="text-muted-foreground" />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Column boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {byStage.map((stage, si) => {
          const Icon = stage.icon;
          const page = stagePages[stage.stage] ?? 0;
          const paged = stage.orders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + si * 0.05 }}
            >
              <div className={`flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl ${stage.bg}`}>
                <Icon size={16} className={stage.color} />
                <h2 className={`text-sm font-bold ${stage.color}`}>
                  {stage.label}
                </h2>
                <span className="ml-auto text-xs bg-white/50 dark:bg-black/20 font-bold px-1.5 py-0.5 rounded-md">
                  {stage.orders.length}
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {stage.orders.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-dashed rounded-xl p-6 text-center text-muted-foreground text-xs"
                  >
                    No orders in this stage
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {paged.map((order) => (
                      <WorkflowCard key={order._id} order={order} staff={staff} />
                    ))}
                  </div>
                )}
              </AnimatePresence>

              <StagePagination
                orders={stage.orders}
                page={page}
                onPage={(p) => setStagePages((prev) => ({ ...prev, [stage.stage]: p }))}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
