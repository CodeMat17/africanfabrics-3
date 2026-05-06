"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Mail,
  CalendarIcon,
  Scissors,
  Sparkles,
  Ruler,
  ShieldCheck,
  GitBranch,
  Loader2,
  User,
  FileText,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
type WorkflowStage = "unassigned" | "tailoring" | "beading" | "fitting" | "qc" | "done";
type StaffRole = "tailor" | "beader" | "fitter" | "qc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

type Order = Doc<"orders">;
type Staff = Doc<"staff">;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  ready_for_qc: { label: "QC Check", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  collected: { label: "Collected", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" },
};

const STAGE_CONFIG: Record<WorkflowStage, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  unassigned: { label: "Unassigned", icon: GitBranch, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  tailoring: { label: "Tailoring", icon: Scissors, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  beading: { label: "Beading", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  fitting: { label: "Fitting", icon: Ruler, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  qc: { label: "QC Check", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  done: { label: "Done", icon: ShieldCheck, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
};

const MALE_MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest", chestAtAmpits: "Chest at Armpits", waist: "Waist", hips: "Hips",
  shoulder: "Shoulder", shoulders: "Shoulders (width)", sleeveLength: "Sleeve Length",
  topLength: "Top Length", trouserWaist: "Trouser Waist", trouserLength: "Trouser Length",
  pantsLength: "Pants Length", thigh: "Thigh", thighAtCrotch: "Thigh at Crotch",
  midThigh: "Mid-Thigh", calf: "Calf", knee: "Knee", belowKnee: "Below Knee",
  ankle: "Ankle", neck: "Neck", forehead: "Forehead", forearm: "Forearm",
  wrist: "Wrist", biceps: "Biceps", elbow: "Elbow", torsoCircum: "Torso Circumference",
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

function FabricImage({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.orders.getFabricPhotoUrl, { storageId });
  if (!url) return null;
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
      <Image
        src={url}
        alt="Fabric photo"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 672px"
      />
    </div>
  );
}

function StaffBadge({ staffId, staff, role }: { staffId?: Id<"staff">; staff: Staff[]; role: string }) {
  const member = staff.find((s) => s._id === staffId);
  if (!member)
    return <span className="text-sm text-muted-foreground italic">Not assigned</span>;
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden="true"
        className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0"
      >
        {member.name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

const ASSIGNED_STAFF: { label: string; role: StaffRole; key: "assignedTailorId" | "assignedBeaderId" | "assignedFitterId" | "assignedQCId" }[] = [
  { label: "Tailor", role: "tailor", key: "assignedTailorId" },
  { label: "Beader", role: "beader", key: "assignedBeaderId" },
  { label: "Fitter", role: "fitter", key: "assignedFitterId" },
  { label: "QC", role: "qc", key: "assignedQCId" },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as Id<"orders">;

  const order = useQuery(api.orders.getById, { orderId });
  const staff = useQuery(api.staff.list, {});

  if (order === undefined || staff === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} aria-label="Loading order" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const stageConfig = STAGE_CONFIG[order.workflowStage];
  const StageIcon = stageConfig.icon;
  const statusConfig = STATUS_CONFIG[order.status];

  const collectionDate = new Date(order.collectionDate);
  const daysUntilDue = differenceInDays(collectionDate, new Date());
  const isOverdue = daysUntilDue < 0 && order.status !== "collected" && order.status !== "completed";

  const measurements = order.gender === "male" ? order.maleMeasurements : order.femaleMeasurements;
  const measurementLabels = order.gender === "male" ? MALE_MEASUREMENT_LABELS : FEMALE_MEASUREMENT_LABELS;
  const measurementEntries = measurements
    ? Object.entries(measurements).filter(([, v]) => !!v)
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 -ml-2">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xl shrink-0"
          >
            {order.clientName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{order.clientName}</h1>
            <p className="text-muted-foreground font-mono text-sm">{order.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${stageConfig.bg}`}>
            <StageIcon size={13} className={stageConfig.color} aria-hidden="true" />
            <span className={`text-xs font-medium ${stageConfig.color}`}>{stageConfig.label}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Info */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User size={15} className="text-muted-foreground" aria-hidden="true" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <span>{order.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <span>{order.email}</span>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
                  isOverdue
                    ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                    : daysUntilDue <= 1
                    ? "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarIcon size={12} aria-hidden="true" />
                <span>
                  Due: {format(collectionDate, "MMM d, yyyy")}
                  {isOverdue
                    ? ` · ${Math.abs(daysUntilDue)}d overdue`
                    : daysUntilDue === 0
                    ? " · Today"
                    : daysUntilDue === 1
                    ? " · Tomorrow"
                    : ` · ${daysUntilDue}d left`}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Garment Details */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scissors size={15} className="text-muted-foreground" aria-hidden="true" />
                Garment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{order.garmentType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium capitalize">{order.gender}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Fabric Photo */}
      {order.fabricPhotoStorageId && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Fabric Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <FabricImage storageId={order.fabricPhotoStorageId} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Special Instructions */}
      {order.specialInstructions && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <FileText size={15} aria-hidden="true" />
                Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.specialInstructions}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Measurements */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ruler size={15} className="text-muted-foreground" aria-hidden="true" />
              Measurements
              <Badge variant="secondary" className="ml-1 text-xs font-normal capitalize">
                {order.gender}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {measurementEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">No measurements recorded yet.</p>
            ) : (
              <dl className="columns-1 sm:columns-2 gap-6">
                {measurementEntries.map(([key, value]) => (
                  <div key={key} className="break-inside-avoid flex justify-between py-2 border-b border-border/40 last:border-0">
                    <dt className="text-sm text-muted-foreground">{measurementLabels[key] ?? key}</dt>
                    <dd className="text-sm font-semibold tabular-nums">{value as string}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Assigned Staff */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Assigned Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ASSIGNED_STAFF.map(({ label, key }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                  <StaffBadge staffId={order[key]} staff={staff} role={label} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
