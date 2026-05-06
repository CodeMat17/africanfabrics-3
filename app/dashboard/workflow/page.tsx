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
  ExternalLink,
  UserCheck,
  Loader2,
} from "lucide-react";
import WorkflowLoading from "./loading";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
type WorkflowStage = "unassigned" | "tailoring" | "beading" | "fitting" | "qc" | "done";
type StaffRole = "tailor" | "beader" | "fitter" | "qc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Order = Doc<"orders">;
type Staff = Doc<"staff">;

// ─── constants ────────────────────────────────────────────────────────────────

const STAGES: {
  stage: WorkflowStage;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { stage: "unassigned", label: "Unassigned", icon: GitBranch,   color: "text-gray-500",   bg: "bg-gray-100 dark:bg-gray-800" },
  { stage: "tailoring",  label: "Tailoring",  icon: Scissors,    color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  { stage: "beading",    label: "Beading",    icon: Sparkles,    color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { stage: "fitting",    label: "Fitting",    icon: Ruler,       color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  { stage: "qc",         label: "QC Check",  icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/30" },
];

const ROLE_LABELS: Record<StaffRole, string> = {
  tailor: "Tailor",
  beader: "Beader",
  fitter: "Fitter",
  qc: "QC Inspector",
};

// Maps a role to the workflow stage it produces
const ROLE_TO_STAGE: Record<StaffRole, "tailoring" | "beading" | "fitting" | "qc"> = {
  tailor: "tailoring",
  beader: "beading",
  fitter: "fitting",
  qc: "qc",
};

// The next workflow stage after marking done
const NEXT_STAGE: Record<WorkflowStage, WorkflowStage> = {
  unassigned: "tailoring",
  tailoring: "beading",
  beading: "fitting",
  fitting: "qc",
  qc: "done",
  done: "done",
};

// The role to assign FOR the current stage (used for initial assign & reassign)
const STAGE_ROLE: Partial<Record<WorkflowStage, StaffRole>> = {
  unassigned: "tailor",
  tailoring: "tailor",
  beading: "beader",
  fitting: "fitter",
  qc: "qc",
};

// The role to assign for the NEXT stage (shown after "Mark Done")
const NEXT_STAGE_ROLE: Partial<Record<WorkflowStage, StaffRole>> = {
  tailoring: "beader",
  beading: "fitter",
  fitting: "qc",
};

// ─── staff selector ───────────────────────────────────────────────────────────

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
  const [search, setSearch] = useState("");

  // Include primary role AND secondary roles
  const eligible = staff.filter(
    (s) =>
      s.isActive &&
      (s.role === role || s.secondaryRoles?.includes(role))
  );

  const filtered = eligible.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const available = filtered.filter((s) => !s.isBusy || s._id === selectedId);
  const busy = filtered.filter((s) => s.isBusy && s._id !== selectedId);

  return (
    <div className="space-y-3">
      <Input
        placeholder={`Search ${ROLE_LABELS[role].toLowerCase()}s…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="space-y-2">
        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active {ROLE_LABELS[role].toLowerCase()}s found
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No match</p>
        ) : (
          <>
            {available.map((member) => {
              const isSelected = member._id === selectedId;
              return (
                <button
                  key={member._id}
                  onClick={() => onSelect(member._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role}
                      {member.secondaryRoles?.includes(role) && member.role !== role
                        ? ` · also ${role}`
                        : ""}
                    </p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-green-400" />
                  {isSelected && <Check size={14} className="text-primary shrink-0" />}
                </button>
              );
            })}
            {busy.map((member) => (
              <button
                key={member._id}
                disabled
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/30 opacity-50 text-left cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">Busy</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-400" />
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── workflow card ────────────────────────────────────────────────────────────

function WorkflowCard({
  order,
  staff,
  onOpenAssign,
  onMarkDone,
  isMarkingDone,
}: {
  order: Order;
  staff: Staff[];
  onOpenAssign: (orderId: Id<"orders">, role: StaffRole) => void;
  onMarkDone: (orderId: Id<"orders">) => void;
  isMarkingDone: boolean;
}) {
  const currentStageConfig = STAGES.find((s) => s.stage === order.workflowStage);
  const stageIndex = STAGES.findIndex((s) => s.stage === order.workflowStage);

  const currentRole = STAGE_ROLE[order.workflowStage];

  const assignedStaffId: Id<"staff"> | undefined = {
    unassigned: undefined,
    tailoring: order.assignedTailorId,
    beading:   order.assignedBeaderId,
    fitting:   order.assignedFitterId,
    qc:        order.assignedQCId,
    done:      undefined,
  }[order.workflowStage];

  const assignedStaffName = staff.find((s) => s._id === assignedStaffId)?.name;
  const isQC = order.workflowStage === "qc";

  return (
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
            <div>
              <h3 className="font-semibold text-sm">{order.clientName}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {order.orderNumber} &middot; {order.garmentType}
              </p>
            </div>
            {currentStageConfig && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 ${currentStageConfig.bg}`}>
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
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${
                    isCompleted ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-border"
                  }`} />
                  {i === STAGES.slice(1).length - 1 && (
                    <div className={`w-3 h-3 rounded-full shrink-0 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Due date */}
          <p className="text-xs text-muted-foreground">
            Due: <span className="font-medium text-foreground">{format(new Date(order.collectionDate), "MMM d, yyyy")}</span>
          </p>

          {/* Assigned staff */}
          {assignedStaffName && (
            <div className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
              <CircleDot size={12} className="text-primary" />
              <span className="text-muted-foreground">Assigned to</span>
              <span className="font-medium">{assignedStaffName}</span>
            </div>
          )}

          {/* View full order link */}
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
                onClick={() => onOpenAssign(order._id, "tailor")}
              >
                <Scissors size={14} />
                Assign Tailor
              </Button>
            ) : (
              <>
                {/* Reassign current stage's staff */}
                {currentRole && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => onOpenAssign(order._id, currentRole)}
                  >
                    <UserCheck size={14} />
                    {assignedStaffId ? "Reassign" : `Assign ${ROLE_LABELS[currentRole]}`}
                  </Button>
                )}

                {/* Mark Done / QC Passed — only enabled when someone is assigned */}
                {assignedStaffId && (
                  <Button
                    size="sm"
                    disabled={isMarkingDone}
                    className={`flex-1 gap-1.5 ${isQC ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                    onClick={() => onMarkDone(order._id)}
                  >
                    {isMarkingDone ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isQC ? (
                      <PackageCheck size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                    {isQC ? "QC Passed" : "Mark Done"}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── pagination helper ────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

function StagePagination({ orders, page, onPage }: { orders: Order[]; page: number; onPage: (p: number) => void }) {
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
      <span>{page + 1} / {total}</span>
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const orders = useQuery(api.orders.listAll);
  const staff = useQuery(api.staff.list, {});

  const assignStaff = useMutation(api.workflow.assignStaff);
  const advanceStage = useMutation(api.workflow.advanceStage);

  const [stagePages, setStagePages] = useState<Record<string, number>>({});

  // Assignment dialog state — lifted to page root so it survives card animations
  const [pendingAssignment, setPendingAssignment] = useState<{
    orderId: Id<"orders">;
    role: StaffRole;
    orderLabel: string;
  } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Id<"staff"> | undefined>();
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Track which order is currently being marked done
  const [markingDoneId, setMarkingDoneId] = useState<Id<"orders"> | null>(null);

  if (orders === undefined || staff === undefined) return <WorkflowLoading />;

  const activeOrders = orders.filter(
    (o) => o.status !== "collected" && o.workflowStage !== "done"
  );

  const byStage = STAGES.map((s) => ({
    ...s,
    orders: activeOrders.filter((o) => o.workflowStage === s.stage),
  }));

  function openAssignDialog(orderId: Id<"orders">, role: StaffRole) {
    const order = orders!.find((o) => o._id === orderId);
    const currentAssignedId: Id<"staff"> | undefined = order
      ? ({
          unassigned: undefined,
          tailoring: order.assignedTailorId,
          beading: order.assignedBeaderId,
          fitting: order.assignedFitterId,
          qc: order.assignedQCId,
          done: undefined,
        } as Record<WorkflowStage, Id<"staff"> | undefined>)[order.workflowStage]
      : undefined;

    setPendingAssignment({
      orderId,
      role,
      orderLabel: order ? `${order.orderNumber} — ${order.clientName}` : "",
    });
    setSelectedStaff(currentAssignedId);
    setAssignError(null);
  }

  async function handleConfirmAssign() {
    if (!pendingAssignment || !selectedStaff) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignStaff({
        orderId: pendingAssignment.orderId,
        staffId: selectedStaff,
        stage: ROLE_TO_STAGE[pendingAssignment.role],
      });
      toast.success("Staff assigned successfully");
      setPendingAssignment(null);
      setSelectedStaff(undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assignment failed";
      setAssignError(msg);
      toast.error("Failed to assign staff", { description: msg });
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleMarkDone(orderId: Id<"orders">) {
    const order = orders!.find((o) => o._id === orderId);
    if (!order) return;

    const toStage = NEXT_STAGE[order.workflowStage];
    const nextRole = NEXT_STAGE_ROLE[order.workflowStage];

    setMarkingDoneId(orderId);
    try {
      await advanceStage({ orderId, toStage });
      toast.success(order.workflowStage === "qc" ? "QC passed" : "Stage advanced");
      // After marking done, immediately open the assignment dialog for the next stage
      if (nextRole) {
        setPendingAssignment({
          orderId,
          role: nextRole,
          orderLabel: `${order.orderNumber} — ${order.clientName}`,
        });
        setSelectedStaff(undefined);
        setAssignError(null);
      }
    } catch (e) {
      toast.error("Failed to advance stage", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setMarkingDoneId(null);
    }
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
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
            const count = activeOrders.filter((o) => o.workflowStage === stage.stage).length;
            const Icon = stage.icon;
            return (
              <div key={stage.stage} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${stage.bg}`}>
                  <Icon size={15} className={stage.color} />
                  <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${stage.bg} ${stage.color} border ${stage.color.replace("text-", "border-")}`}>
                    {count}
                  </span>
                </div>
                {i < STAGES.length - 1 && <ChevronRight size={14} className="text-muted-foreground" />}
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
                  <h2 className={`text-sm font-bold ${stage.color}`}>{stage.label}</h2>
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
                        <WorkflowCard
                          key={order._id}
                          order={order}
                          staff={staff}
                          onOpenAssign={openAssignDialog}
                          onMarkDone={handleMarkDone}
                          isMarkingDone={markingDoneId === order._id}
                        />
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

      {/* Assignment dialog — rendered at page root, outside all cards/columns */}
      <Dialog
        open={!!pendingAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAssignment(null);
            setSelectedStaff(undefined);
            setAssignError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm mx-4 max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-primary" />
              {pendingAssignment ? `Assign ${ROLE_LABELS[pendingAssignment.role]}` : "Assign Staff"}
            </DialogTitle>
            <DialogDescription>
              {pendingAssignment?.orderLabel}
              <br />
              <span className="text-xs">Available staff shown first. Busy staff are disabled.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-2 pr-1">
            {pendingAssignment && (
              <StaffSelector
                role={pendingAssignment.role}
                staff={staff}
                selectedId={selectedStaff}
                onSelect={setSelectedStaff}
              />
            )}
          </div>

          {assignError && (
            <p className="text-xs text-red-500 px-1 shrink-0">{assignError}</p>
          )}

          <div className="flex gap-3 justify-end mt-2 shrink-0 pt-3 border-t">
            <Button variant="outline" onClick={() => { setPendingAssignment(null); setSelectedStaff(undefined); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAssign} disabled={!selectedStaff || isAssigning}>
              {isAssigning ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Confirm Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
