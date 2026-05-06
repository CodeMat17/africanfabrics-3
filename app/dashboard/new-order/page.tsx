"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Ruler,
  ImageIcon,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Loader2,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
type MaleMeasurements = { chest?: string; chestAtAmpits?: string; waist?: string; hips?: string; sleeveLength?: string; topLength?: string; trouserWaist?: string; trouserLength?: string; thigh?: string; calf?: string; forehead?: string; forearm?: string; wrist?: string; torsoCircum?: string; pantsLength?: string; thighAtCrotch?: string; midThigh?: string; knee?: string; belowKnee?: string; ankle?: string; biceps?: string; elbow?: string; shoulders?: string; neck?: string };
type FemaleMeasurements = { bust?: string; waist?: string; hips?: string; shoulders?: string; sleeveLength?: string; topLength?: string; skirtLength?: string; thigh?: string; neck?: string; overBust?: string; underBust?: string; neckToHeel?: string; neckToAboveKnee?: string; armLength?: string; shoulderSeam?: string; armHole?: string; foreArm?: string; vNeckCut?: string; aboveKneeToAnkle?: string; waistToAboveKnee?: string; blouseLength?: string };

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const defaultMale: MaleMeasurements = {
  chest: "",
  chestAtAmpits: "",
  waist: "",
  hips: "",
  shoulders: "",
  neck: "",
  sleeveLength: "",
  topLength: "",
  trouserWaist: "",
  trouserLength: "",
  thigh: "",
  calf: "",
  forehead: "",
  forearm: "",
  wrist: "",
  torsoCircum: "",
  pantsLength: "",
  thighAtCrotch: "",
  midThigh: "",
  knee: "",
  belowKnee: "",
  ankle: "",
  biceps: "",
  elbow: "",
};

const defaultFemale: FemaleMeasurements = {
  bust: "",
  overBust: "",
  underBust: "",
  waist: "",
  hips: "",
  shoulders: "",
  neck: "",
  sleeveLength: "",
  topLength: "",
  skirtLength: "",
  thigh: "",
  neckToHeel: "",
  neckToAboveKnee: "",
  armLength: "",
  shoulderSeam: "",
  armHole: "",
  foreArm: "",
  vNeckCut: "",
  aboveKneeToAnkle: "",
  waistToAboveKnee: "",
  blouseLength: "",
};

interface FormData {
  name: string;
  phone: string;
  email: string;
  garmentType: string;
  gender: "male" | "female" | "";
  collectionDate: Date | undefined;
  maleMeasurements: MaleMeasurements;
  femaleMeasurements: FemaleMeasurements;
  fabricPhotoPreview: string;
  specialInstructions: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const createOrder = useMutation(api.orders.create);
  const generateUploadUrl = useMutation(api.orders.generateUploadUrl);

  const [currentStep, setCurrentStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fabricFile, setFabricFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    garmentType: "",
    gender: "",
    collectionDate: undefined,
    maleMeasurements: { ...defaultMale },
    femaleMeasurements: { ...defaultFemale },
    fabricPhotoPreview: "",
    specialInstructions: "",
  });

  const updateFormData = (key: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateMeasurement = (
    gender: "male" | "female",
    key: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [`${gender}Measurements`]: {
        ...(gender === "male"
          ? prev.maleMeasurements
          : prev.femaleMeasurements),
        [key]: value,
      },
    }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const getCurrentMeasurements = () =>
    formData.gender === "male"
      ? formData.maleMeasurements
      : formData.femaleMeasurements;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFabricFile(file);
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      updateFormData("fabricPhotoPreview", reader.result as string);
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    updateFormData("fabricPhotoPreview", "");
    setFabricFile(null);
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Invalid email";
      if (!formData.garmentType.trim())
        newErrors.garmentType = "Garment type is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.collectionDate)
        newErrors.collectionDate = "Collection date is required";
    }

    if (step === 2 && formData.gender) {
      const measurements = getCurrentMeasurements();
      Object.entries(measurements).forEach(([key, val]) => {
        if (!val.trim()) newErrors[key] = "Required";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => s + 1);
  };

  const prevStep = () => setCurrentStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setIsSubmitting(true);
    try {
      let fabricPhotoStorageId: string | undefined;

      if (fabricFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": fabricFile.type },
          body: fabricFile,
        });
        const { storageId } = await result.json();
        fabricPhotoStorageId = storageId;
      }

      await createOrder({
        clientName: formData.name,
        phone: formData.phone,
        email: formData.email,
        garmentType: formData.garmentType,
        gender: formData.gender as "male" | "female",
        collectionDate: formData.collectionDate!.getTime(),
        fabricPhotoStorageId: fabricPhotoStorageId as never,
        specialInstructions: formData.specialInstructions || undefined,
        maleMeasurements:
          formData.gender === "male" ? formData.maleMeasurements : undefined,
        femaleMeasurements:
          formData.gender === "female" ? formData.femaleMeasurements : undefined,
      });

      router.push("/dashboard/orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Tailor Order Form</h1>
        <p className="text-muted-foreground mt-1">
          Let&apos;s create a perfect garment
        </p>
      </motion.div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    currentStep >= step
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-background text-muted-foreground border-2 border-border"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {currentStep > step ? <Check size={20} /> : step}
                </motion.div>
                <span className="text-xs mt-2 text-muted-foreground hidden sm:block">
                  {step === 1 && "Info"}
                  {step === 2 && "Measure"}
                  {step === 3 && "Fabric"}
                  {step === 4 && "Review"}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-all ${
                    currentStep > step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <motion.div
        className="rounded-2xl shadow-xl overflow-hidden border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Client Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border">
                    <User className="text-primary" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Client Information</h2>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      placeholder="Enter full name"
                      className={errors.name ? "border-red-400" : ""}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm">{errors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2  gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          updateFormData("phone", e.target.value)
                        }
                        placeholder="+234 xxx xxxx xxx"
                        className={errors.phone ? "border-red-400" : ""}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          updateFormData("email", e.target.value)
                        }
                        placeholder="email@example.com"
                        className={errors.email ? "border-red-400" : ""}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="garmentType">Garment Type *</Label>
                    <Input
                      id="garmentType"
                      value={formData.garmentType}
                      onChange={(e) =>
                        updateFormData("garmentType", e.target.value)
                      }
                      placeholder="e.g., Agbada, Kaftan, Suit"
                      className={errors.garmentType ? "border-red-400" : ""}
                    />
                    {errors.garmentType && (
                      <p className="text-red-500 text-sm">
                        {errors.garmentType}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Gender *</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(v) =>
                          updateFormData("gender", v as "male" | "female")
                        }
                      >
                        <div className="grid grid-cols-2 gap-4 border p-2.5 rounded-lg">
                          <Label
                            htmlFor="male"
                            className="flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                          >
                            <RadioGroupItem value="male" id="male" />
                            <span className="font-medium">Male</span>
                          </Label>
                          <Label
                            htmlFor="female"
                            className="flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                          >
                            <RadioGroupItem value="female" id="female" />
                            <span className="font-medium">Female</span>
                          </Label>
                        </div>
                      </RadioGroup>
                      {errors.gender && (
                        <p className="text-red-500 text-sm">{errors.gender}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Collection Date *</Label>
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${
                              !formData.collectionDate &&
                              "text-muted-foreground"
                            } ${errors.collectionDate ? "border-red-400" : ""}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.collectionDate
                              ? format(formData.collectionDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.collectionDate}
                            onSelect={(date) => {
                              updateFormData("collectionDate", date);
                              if (date) setCalendarOpen(false);
                            }}
                            disabled={(date) =>
                              date <
                              new Date(new Date().setHours(0, 0, 0, 0))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.collectionDate && (
                        <p className="text-red-500 text-sm">
                          {errors.collectionDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Measurements */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border">
                    <Ruler className="text-primary" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">
                    {formData.gender === "male" ? "Male" : "Female"}{" "}
                    Measurements
                  </h2>
                </div>

                {!formData.gender ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Please select gender in Step 1 to view measurements
                    </p>
                    <Button onClick={() => setCurrentStep(1)} variant="outline">
                      Go Back to Step 1
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(
                      Object.keys(getCurrentMeasurements()) as string[]
                    ).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()} *
                        </Label>
                        <Input
                          id={key}
                          type="text"
                          value={
                            (getCurrentMeasurements() as unknown as Record<string, string>)[key]
                          }
                          onChange={(e) =>
                            updateMeasurement(
                              formData.gender as "male" | "female",
                              key,
                              e.target.value
                            )
                          }
                          className={errors[key] ? "border-red-400" : ""}
                          placeholder="e.g. 42 or L"
                        />
                        {errors[key] && (
                          <p className="text-red-500 text-sm">{errors[key]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Fabric */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border">
                    <ImageIcon className="text-primary" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Fabric Details</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Fabric Photo (Optional)</Label>
                    {!formData.fabricPhotoPreview ? (
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isCompressing}
                        />
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                            isCompressing
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:border-primary"
                          }`}
                        >
                          {isCompressing ? (
                            <>
                              <Loader2
                                className="mx-auto mb-3 text-primary animate-spin"
                                size={40}
                              />
                              <p className="font-medium mb-1">
                                Processing image...
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload
                                className="mx-auto mb-3 text-muted-foreground"
                                size={40}
                              />
                              <p className="font-medium mb-1">
                                Click to upload fabric photo
                              </p>
                              <p className="text-sm text-muted-foreground">
                                PNG, JPG up to 10MB
                              </p>
                            </>
                          )}
                        </motion.div>
                      </label>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-xl overflow-hidden border-2"
                      >
                        <div className="relative w-full h-64">
                          <Image
                            src={formData.fabricPhotoPreview}
                            alt="Fabric preview"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                          />
                        </div>
                        <div className="absolute top-3 right-3 flex gap-2">
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-9 w-9"
                              asChild
                            >
                              <span>
                                <Upload size={18} />
                              </span>
                            </Button>
                          </label>
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9"
                            onClick={removePhoto}
                          >
                            <X size={18} className="text-red-600" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialInstructions">
                      Special Instructions (Optional)
                    </Label>
                    <Textarea
                      id="specialInstructions"
                      value={formData.specialInstructions}
                      onChange={(e) =>
                        updateFormData("specialInstructions", e.target.value)
                      }
                      placeholder="Any special requirements or notes..."
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-green-50 dark:bg-green-950/30">
                    <FileText className="text-green-600" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Review & Confirm</h2>
                </div>

                <div className="space-y-5">
                  <div className="bg-muted rounded-xl p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      Client Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {[
                        ["Name", formData.name],
                        ["Phone", formData.phone],
                        ["Email", formData.email],
                        ["Garment", formData.garmentType],
                        ["Gender", formData.gender],
                        [
                          "Collection",
                          formData.collectionDate
                            ? format(formData.collectionDate, "PPP")
                            : "—",
                        ],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <span className="text-muted-foreground">{label}:</span>{" "}
                          <span className="font-medium capitalize">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted rounded-xl p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Ruler size={16} className="text-primary" />
                      Measurements
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {Object.entries(getCurrentMeasurements()).map(
                        ([key, val]) => (
                          <div key={key}>
                            <span className="text-muted-foreground capitalize block">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span className="font-medium">{val}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="bg-muted rounded-xl p-5">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon size={16} className="text-primary" />
                      Fabric Details
                    </h3>
                    {formData.fabricPhotoPreview && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3">
                        <Image
                          src={formData.fabricPhotoPreview}
                          alt="Fabric"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    )}
                    {formData.specialInstructions && (
                      <div className="mt-2">
                        <span className="text-muted-foreground text-sm">
                          Instructions:
                        </span>
                        <p className="font-medium text-sm mt-1">
                          {formData.specialInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 md:px-8 flex justify-between items-center border-t">
          {currentStep > 1 ? (
            <Button
              variant="ghost"
              onClick={prevStep}
              className="gap-2"
              disabled={isSubmitting || isCompressing}
            >
              <ChevronLeft size={20} />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              className="gap-2"
              disabled={isCompressing}
            >
              Next
              <ChevronRight size={20} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Submit Order
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
