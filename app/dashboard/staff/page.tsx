"use client";

import { motion } from "framer-motion";
import { Users, Scissors, Sparkles, Ruler, ShieldCheck, CircleDot, Loader2, UserPlus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

type Staff = Doc<"staff">;
type StaffRole = "tailor" | "beader" | "fitter" | "qc";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } },
};

const ROLE_CONFIG: Record<
  StaffRole,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  tailor: {
    label: "Tailor",
    icon: Scissors,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  beader: {
    label: "Beader",
    icon: Sparkles,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  fitter: {
    label: "Fitter",
    icon: Ruler,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  qc: {
    label: "Quality Control",
    icon: ShieldCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
};

const ROLE_ORDER: StaffRole[] = ["tailor", "beader", "fitter", "qc"];

const ALL_ROLES: StaffRole[] = ["tailor", "beader", "fitter", "qc"];
const ROLE_LABELS: Record<StaffRole, string> = {
  tailor: "Tailor",
  beader: "Beader",
  fitter: "Fitter",
  qc: "Quality Control",
};

function RoleCheckboxes({
  primaryRole,
  value,
  onChange,
}: {
  primaryRole: StaffRole | "";
  value: StaffRole[];
  onChange: (roles: StaffRole[]) => void;
}) {
  const available = ALL_ROLES.filter((r) => r !== primaryRole);
  if (!primaryRole) return null;
  return (
    <div className="space-y-1.5">
      <Label>Secondary Roles</Label>
      <div className="flex flex-wrap gap-3 pt-1">
        {available.map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={value.includes(r)}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, r] : value.filter((x) => x !== r))
              }
            />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </div>
    </div>
  );
}

function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [secondaryRoles, setSecondaryRoles] = useState<StaffRole[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const createStaff = useMutation(api.staff.create);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role) return;
    setLoading(true);
    try {
      await createStaff({
        name: name.trim(),
        role: role as StaffRole,
        secondaryRoles: secondaryRoles.length > 0 ? secondaryRoles : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setRole("");
      setSecondaryRoles([]);
      setPhone("");
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(v: StaffRole) {
    setRole(v);
    setSecondaryRoles((prev) => prev.filter((r) => r !== v));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus size={16} />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Primary Role *</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as StaffRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor">Tailor</SelectItem>
                <SelectItem value="beader">Beader</SelectItem>
                <SelectItem value="fitter">Fitter</SelectItem>
                <SelectItem value="qc">Quality Control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RoleCheckboxes primaryRole={role} value={secondaryRoles} onChange={setSecondaryRoles} />
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              type="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
              type="email"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !role}>
              {loading && <Loader2 size={14} className="animate-spin mr-1" />}
              Add Staff
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({ member }: { member: Staff }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<StaffRole>(member.role as StaffRole);
  const [secondaryRoles, setSecondaryRoles] = useState<StaffRole[]>(
    (member.secondaryRoles as StaffRole[]) ?? []
  );
  const [phone, setPhone] = useState(member.phone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [loading, setLoading] = useState(false);
  const updateStaff = useMutation(api.staff.update);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateStaff({
        staffId: member._id as Id<"staff">,
        name: name.trim(),
        role,
        secondaryRoles: secondaryRoles.length > 0 ? secondaryRoles : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(v: StaffRole) {
    setRole(v);
    setSecondaryRoles((prev) => prev.filter((r) => r !== v));
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(member.name);
      setRole(member.role as StaffRole);
      setSecondaryRoles((member.secondaryRoles as StaffRole[]) ?? []);
      setPhone(member.phone ?? "");
      setEmail(member.email ?? "");
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <Pencil size={13} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Primary Role *</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as StaffRole)}>
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tailor">Tailor</SelectItem>
                <SelectItem value="beader">Beader</SelectItem>
                <SelectItem value="fitter">Fitter</SelectItem>
                <SelectItem value="qc">Quality Control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RoleCheckboxes primaryRole={role} value={secondaryRoles} onChange={setSecondaryRoles} />
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              type="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
              type="email"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 size={14} className="animate-spin mr-1" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStaffButton({ member }: { member: Staff }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const deactivate = useMutation(api.staff.deactivate);

  async function handleDelete() {
    setLoading(true);
    try {
      await deactivate({ staffId: member._id as Id<"staff"> });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 size={13} />
    </Button>
  );
}

export default function StaffPage() {
  const staff = useQuery(api.staff.list, {});
  const orders = useQuery(api.orders.listAll);

  if (staff === undefined || orders === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  const totalStaff = staff.length;
  const busyStaff = staff.filter((s) => s.isBusy).length;
  const availableStaff = totalStaff - busyStaff;

  const getOrderById = (id?: string) =>
    orders.find((o) => o._id === id);

  return (
    <div className='max-w-4xl mx-auto space-y-8'>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Staff</h1>
            <p className='text-muted-foreground mt-1'>Manage your atelier team</p>
          </div>
          <AddStaffDialog />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className='grid grid-cols-3 gap-2'>
        {[
          {
            label: "Total Staff",
            value: totalStaff,
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Busy",
            value: busyStaff,
            icon: CircleDot,
            color: "text-red-500",
            bg: "bg-red-50 dark:bg-red-950/30",
          },
          {
            label: "Available",
            value: availableStaff,
            icon: CircleDot,
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
        ].map((stat) => (
          <Card key={stat.label} className='border-border/60 py-0'>
            <CardContent className='p-5'>
              <div className='flex flex-col sm:flex-row items-center justify-center sm:justify-between text-center gap-3'>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4 justify-center  items-center">
                  <p className='text-sm text-muted-foreground font-medium'>
                    {stat.label}
                  </p>
                  <p className='text-3xl font-bold mt-1'>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Staff by role */}
      {ROLE_ORDER.map((role, ri) => {
        const roleStaff = staff.filter((s) => s.role === role && s.isActive);
        const config = ROLE_CONFIG[role];
        const Icon = config.icon;

        return (
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + ri * 0.06 }}>
            <div className='flex items-center gap-3 mb-4'>
              <div className={`p-2.5 rounded-xl ${config.bg}`}>
                <Icon size={18} className={config.color} />
              </div>
              <h2 className='text-lg font-semibold'>{config.label}s</h2>
              <span className='text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground'>
                {roleStaff.length}
              </span>
            </div>

            <motion.div
              variants={container}
              initial='hidden'
              animate='show'
              className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {roleStaff.map((member) => {
                const assignedOrder = member.assignedOrderId
                  ? getOrderById(member.assignedOrderId)
                  : undefined;
                return (
                  <motion.div key={member._id} variants={item}>
                    <Card className='border-border/60 hover:shadow-md transition-all duration-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold shrink-0'>
                            {member.name.charAt(0)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <p className='font-semibold text-sm truncate'>
                                {member.name}
                              </p>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  member.isBusy ? "bg-red-400" : "bg-green-400"
                                }`}
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className={`text-xs font-medium ${config.color}`}>
                                {config.label}
                              </p>
                              {member.secondaryRoles?.map((sr) => (
                                <span
                                  key={sr}
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_CONFIG[sr as StaffRole].color} ${ROLE_CONFIG[sr as StaffRole].bg}`}
                                >
                                  {ROLE_CONFIG[sr as StaffRole].label}
                                </span>
                              ))}
                            </div>
                            {assignedOrder ? (
                              <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                                Working on {assignedOrder.orderNumber} &mdash;{" "}
                                {assignedOrder.clientName}
                              </p>
                            ) : (
                              <p className='text-xs text-green-600 dark:text-green-400 mt-0.5'>
                                Available
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                member.isBusy
                                  ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                  : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                              }`}>
                              {member.isBusy ? "Busy" : "Free"}
                            </span>
                            <EditStaffDialog member={member} />
                            <DeleteStaffButton member={member} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {roleStaff.length === 0 && (
                <p className='text-sm text-muted-foreground col-span-2'>
                  No active {config.label.toLowerCase()}s
                </p>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
