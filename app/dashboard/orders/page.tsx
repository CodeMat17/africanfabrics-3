"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  PackageCheck,
  CalendarIcon,
  Phone,
  Mail,
  Scissors,
  ExternalLink,
  User,
  FileText,
  Ruler,
  Sparkles,
  ShieldCheck,
  GitBranch,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
type OrderStatus = "pending" | "in_progress" | "ready_for_qc" | "completed" | "collected";
type WorkflowStage = "unassigned" | "tailoring" | "beading" | "fitting" | "qc" | "done";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import OrdersLoading from "./loading";

type Order = Omit<Doc<"orders">, "maleMeasurements" | "femaleMeasurements" | "specialInstructions" | "completedAt" | "collectedAt">;
type FullOrder = Doc<"orders">;
type Staff = Doc<"staff">;

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  ready_for_qc: { label: "QC Check", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  collected: { label: "Collected", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" },
};

const STAGE_CONFIG: Record<WorkflowStage, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  unassigned: { label: "Unassigned", icon: GitBranch, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  tailoring:  { label: "Tailoring",  icon: Scissors,   color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  beading:    { label: "Beading",    icon: Sparkles,   color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  fitting:    { label: "Fitting",    icon: Ruler,      color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  qc:         { label: "QC Check",  icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  done:       { label: "Done",      icon: ShieldCheck, color: "text-teal-600",  bg: "bg-teal-50 dark:bg-teal-950/30" },
};

const WORKFLOW_LABELS: Record<string, string> = {
  unassigned: "Unassigned", tailoring: "Tailoring", beading: "Beading",
  fitting: "Fitting", qc: "QC", done: "Done",
};

const ALL_FILTERS: (OrderStatus | "all")[] = ["all", "pending", "in_progress", "ready_for_qc", "completed", "collected"];

const MALE_MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest", chestAtAmpits: "Chest at Armpits", waist: "Waist", hips: "Hips",
  shoulders: "Shoulders (width)", sleeveLength: "Sleeve Length", topLength: "Top Length",
  trouserWaist: "Trouser Waist", trouserLength: "Trouser Length", pantsLength: "Pants Length",
  thigh: "Thigh", thighAtCrotch: "Thigh at Crotch", midThigh: "Mid-Thigh", calf: "Calf",
  knee: "Knee", belowKnee: "Below Knee", ankle: "Ankle", neck: "Neck",
  forehead: "Forehead", forearm: "Forearm", wrist: "Wrist", biceps: "Biceps",
  elbow: "Elbow", torsoCircum: "Torso Circumference",
};

const FEMALE_MEASUREMENT_LABELS: Record<string, string> = {
  bust: "Bust", overBust: "Over Bust", underBust: "Under Bust", waist: "Waist",
  hips: "Hips", shoulders: "Shoulders", sleeveLength: "Sleeve Length",
  armLength: "Arm Length", armHole: "Arm Hole", foreArm: "Forearm",
  topLength: "Top Length", blouseLength: "Blouse Length", skirtLength: "Skirt Length",
  thigh: "Thigh", neck: "Neck", shoulderSeam: "Shoulder Seam", vNeckCut: "V-Neck Cut",
  neckToHeel: "Neck to Heel", neckToAboveKnee: "Neck to Above Knee",
  waistToAboveKnee: "Waist to Above Knee", aboveKneeToAnkle: "Above Knee to Ankle",
};

// ─── sub-components ───────────────────────────────────────────────────────────

function FabricImage({ url }: { url: string }) {
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-muted">
      <Image src={url} alt="Fabric photo" fill className="object-cover" sizes="(max-width: 640px) 100vw, 480px" />
    </div>
  );
}

function FabricThumbnail({ url }: { url: string }) {
  return (
    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted mb-3">
      <Image src={url} alt="Fabric thumbnail" fill className="object-cover" sizes="40px" />
    </div>
  );
}

function StaffBadge({ staffId, staff, role }: { staffId?: Id<"staff">; staff: Staff[]; role: string }) {
  const member = staff.find((s) => s._id === staffId);
  if (!member) return <span className="text-sm text-muted-foreground italic">Not assigned</span>;
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
        {member.name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

// ─── order detail content (view-only, workflow managed on Workflow page) ──────

function OrderDetailContent({ order, staff, fabricUrl }: { order: FullOrder; staff: Staff[]; fabricUrl?: string | null }) {
  const collectionDate = new Date(order.collectionDate);
  const daysUntilDue = differenceInDays(collectionDate, new Date());
  const isOverdue = daysUntilDue < 0 && order.status !== "collected" && order.status !== "completed";

  const measurements = order.gender === "male" ? order.maleMeasurements : order.femaleMeasurements;
  const measurementLabels = order.gender === "male" ? MALE_MEASUREMENT_LABELS : FEMALE_MEASUREMENT_LABELS;
  const measurementEntries = measurements ? Object.entries(measurements).filter(([, v]) => !!v) : [];

  const stageConfig = STAGE_CONFIG[order.workflowStage];
  const StageIcon = stageConfig.icon;
  const statusConfig = STATUS_CONFIG[order.status];

  return (
    <div className="space-y-6">
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${stageConfig.bg}`}>
          <StageIcon size={13} className={stageConfig.color} aria-hidden="true" />
          <span className={`text-xs font-medium ${stageConfig.color}`}>{stageConfig.label}</span>
        </div>
      </div>

      {/* Client info */}
      <section aria-labelledby="detail-client-heading">
        <h3 id="detail-client-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <User size={13} aria-hidden="true" /> Client Information
        </h3>
        <div className="space-y-2 rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <span>{order.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <span>{order.email}</span>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 mt-1 ${
            isOverdue ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              : daysUntilDue <= 1 ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
              : "bg-muted text-muted-foreground"
          }`}>
            <CalendarIcon size={12} aria-hidden="true" />
            <span>
              Due: {format(collectionDate, "MMM d, yyyy")}
              {isOverdue ? ` · ${Math.abs(daysUntilDue)}d overdue`
                : daysUntilDue === 0 ? " · Today"
                : daysUntilDue === 1 ? " · Tomorrow"
                : ` · ${daysUntilDue}d left`}
            </span>
          </div>
        </div>
      </section>

      {/* Garment details */}
      <section aria-labelledby="detail-garment-heading">
        <h3 id="detail-garment-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Scissors size={13} aria-hidden="true" /> Garment Details
        </h3>
        <div className="rounded-xl border border-border/60 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{order.garmentType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gender</span>
            <span className="font-medium capitalize">{order.gender}</span>
          </div>
        </div>
      </section>

      {/* Fabric photo */}
      {fabricUrl && (
        <section aria-labelledby="detail-fabric-heading">
          <h3 id="detail-fabric-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Fabric Photo
          </h3>
          <FabricImage url={fabricUrl} />
        </section>
      )}

      {/* Special instructions */}
      {order.specialInstructions && (
        <section aria-labelledby="detail-instructions-heading">
          <h3 id="detail-instructions-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <FileText size={13} aria-hidden="true" /> Special Instructions
          </h3>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.specialInstructions}</p>
          </div>
        </section>
      )}

      {/* Measurements */}
      <section aria-labelledby="detail-measurements-heading">
        <h3 id="detail-measurements-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Ruler size={13} aria-hidden="true" /> Measurements
          <Badge variant="secondary" className="ml-1 text-xs font-normal capitalize">{order.gender}</Badge>
        </h3>
        <div className="rounded-xl border border-border/60 p-4">
          {measurementEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No measurements recorded yet.</p>
          ) : (
            <dl className="divide-y divide-border/40">
              {measurementEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between py-2">
                  <dt className="text-sm text-muted-foreground">{measurementLabels[key] ?? key}</dt>
                  <dd className="text-sm font-semibold tabular-nums">{value as string}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Assigned staff */}
      <section aria-labelledby="detail-staff-heading">
        <h3 id="detail-staff-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Assigned Staff
        </h3>
        <div className="rounded-xl border border-border/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { label: "Tailor", id: order.assignedTailorId },
            { label: "Beader", id: order.assignedBeaderId },
            { label: "Fitter", id: order.assignedFitterId },
            { label: "QC",     id: order.assignedQCId },
          ] as const).map(({ label, id }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <StaffBadge staffId={id} staff={staff} role={label} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── order card ───────────────────────────────────────────────────────────────

function OrderCard({ order, staff, onViewDetails, fabricUrl }: {
  order: Order;
  staff: Staff[];
  onViewDetails: (orderId: Id<"orders">) => void;
  fabricUrl?: string | null;
}) {
  const markCollected = useMutation(api.workflow.markCollected);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function getStaffName(staffId: Id<"staff"> | undefined) {
    if (!staffId) return null;
    return staff.find((s) => s._id === staffId)?.name ?? null;
  }

  function workflowBadgeLabel() {
    const stage = order.workflowStage;
    if (stage === "tailoring") { const n = getStaffName(order.assignedTailorId); return n ? `Tailoring — ${n}` : "Tailoring"; }
    if (stage === "beading")   { const n = getStaffName(order.assignedBeaderId); return n ? `Beading — ${n}` : "Beading"; }
    if (stage === "fitting")   { const n = getStaffName(order.assignedFitterId); return n ? `Fitting — ${n}` : "Fitting"; }
    if (stage === "qc")        { const n = getStaffName(order.assignedQCId);     return n ? `QC — ${n}` : "QC"; }
    return WORKFLOW_LABELS[stage];
  }

  const collectionDate = new Date(order.collectionDate);
  const daysUntilDue = differenceInDays(collectionDate, new Date());
  const isOverdue = daysUntilDue < 0 && order.status !== "collected" && order.status !== "completed";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <Card className="border-border/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-end">
              <Badge className={`text-xs font-medium p-3 rounded-full shrink-0 ${STATUS_CONFIG[order.status].className}`}>
                {STATUS_CONFIG[order.status].label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {fabricUrl ? (
                  <FabricThumbnail url={fabricUrl} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                    {order.clientName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{order.clientName}</h3>
                <p className="text-xs text-muted-foreground font-mono">{order.orderNumber}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scissors size={14} className="text-primary shrink-0" aria-hidden="true" />
              <span className="font-medium text-foreground">{order.garmentType}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="capitalize">{order.gender}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone size={12} aria-hidden="true" />
              <span>{order.phone}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail size={12} aria-hidden="true" />
              <span>{order.email}</span>
            </div>

            <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
              isOverdue ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                : daysUntilDue <= 1 ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                : "bg-muted text-muted-foreground"
            }`}>
              <CalendarIcon size={12} aria-hidden="true" />
              <span>
                Due: {format(collectionDate, "MMM d, yyyy")}
                {isOverdue ? ` · ${Math.abs(daysUntilDue)}d overdue`
                  : daysUntilDue === 0 ? " · Today"
                  : daysUntilDue === 1 ? " · Tomorrow"
                  : ` · ${daysUntilDue}d left`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 gap-2">
              <span className="text-xs bg-muted px-2 py-1 rounded-md font-medium truncate">
                {workflowBadgeLabel()}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm" variant="ghost" className="gap-1 text-xs h-7 px-2"
                  onClick={() => onViewDetails(order._id)}
                  aria-label={`View details for ${order.clientName} order ${order.orderNumber}`}
                >
                  <ExternalLink size={12} aria-hidden="true" /> Details
                </Button>

                {order.status === "completed" && (
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <PackageCheck size={14} aria-hidden="true" /> Collected?
                  </Button>
                )}

                {order.status === "collected" && (
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                    <PackageCheck size={13} aria-hidden="true" /> Collected
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Collection</DialogTitle>
            <DialogDescription>
              Mark order <strong>{order.orderNumber}</strong> for <strong>{order.clientName}</strong> as collected by client?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
              try {
                await markCollected({ orderId: order._id });
                toast.success("Order marked as collected");
              } catch (e) {
                toast.error("Failed to mark order as collected", {
                  description: e instanceof Error ? e.message : undefined,
                });
              } finally {
                setConfirmOpen(false);
              }
            }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <PackageCheck size={16} className="mr-2" aria-hidden="true" /> Confirm Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const filterLabels: Record<string, string> = {
  all: "All", pending: "Pending", in_progress: "In Progress",
  ready_for_qc: "QC Check", completed: "Completed", collected: "Collected",
};

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");
  const [detailOrderId, setDetailOrderId] = useState<Id<"orders"> | null>(null);

  const { results: orders, status: queryStatus, loadMore } = usePaginatedQuery(
    api.orders.listCards,
    { status: activeFilter === "all" ? undefined : activeFilter },
    { initialNumItems: PAGE_SIZE },
  );

  const staff = useQuery(api.staff.list, {});

  // Fetch full order (with measurements) only when detail sheet is open
  const detailOrder = useQuery(
    api.orders.getById,
    detailOrderId ? { orderId: detailOrderId } : "skip"
  );

  // Client-side search within all loaded results
  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.clientName.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.garmentType.toLowerCase().includes(q)
    );
  });

  const storageIds = filtered
    .map((o) => o.fabricPhotoStorageId)
    .filter((id): id is Id<"_storage"> => id !== undefined);

  const photoUrls = useQuery(
    api.orders.getFabricPhotoUrls,
    storageIds.length > 0 ? { storageIds } : "skip"
  );

  // Detail sheet photo URL (if order has fabric photo)
  const detailStorageId = detailOrder?.fabricPhotoStorageId;
  const detailPhotoUrlResult = useQuery(
    api.orders.getFabricPhotoUrls,
    detailStorageId ? { storageIds: [detailStorageId] } : "skip"
  );
  const detailFabricUrl = detailStorageId
    ? (detailPhotoUrlResult?.[detailStorageId] ?? null)
    : null;

  if (queryStatus === "LoadingFirstPage" || staff === undefined) return <OrdersLoading />;

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-1">{filtered.length} order{filtered.length !== 1 && "s"} loaded</p>
          </div>

        </motion.div>

        {/* Search + Filter */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="relative">
            <label htmlFor="order-search" className="sr-only">Search orders</label>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              id="order-search"
              placeholder="Search by name, order ID, or garment…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter orders by status">
            {ALL_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setActiveFilter(f); }}
                aria-pressed={activeFilter === f}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  activeFilter === f ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Orders Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-muted-foreground">
              <Filter size={40} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
              <p className="font-medium">No orders found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  staff={staff}
                  onViewDetails={setDetailOrderId}
                  fabricUrl={order.fabricPhotoStorageId ? (photoUrls?.[order.fabricPhotoStorageId] ?? null) : null}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load More */}
        {queryStatus === "CanLoadMore" && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => loadMore(PAGE_SIZE)}>
              Load more orders
            </Button>
          </div>
        )}
      </div>

      {/* Order detail sheet — view only; workflow actions live on the Workflow page */}
      <Sheet open={!!detailOrderId} onOpenChange={(open) => { if (!open) setDetailOrderId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0">
          {detailOrder && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {detailOrder.clientName.charAt(0)}
                  </div>
                  <div>
                    <SheetTitle className="text-left leading-tight">{detailOrder.clientName}</SheetTitle>
                    <SheetDescription className="text-left font-mono text-xs mt-0.5">
                      {detailOrder.orderNumber} &middot; {detailOrder.garmentType}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <OrderDetailContent order={detailOrder} staff={staff} fabricUrl={detailFabricUrl} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
