"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, InfoIcon } from "lucide-react"
import { format } from "date-fns"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

const assetFormSchema = z.object({
  // Basic Information
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  serialNumber: z.string().min(1, { message: "Serial number is required." }),

  // Financial Information
  purchaseDate: z.date({ required_error: "Purchase date is required." }),
  purchasePrice: z.coerce.number().min(0, { message: "Purchase price must be a positive number." }),
  currentValue: z.coerce.number().min(0, { message: "Current value must be a positive number." }),
  depreciableCost: z.coerce.number().min(0, { message: "Depreciable cost must be a positive number." }).optional(),
  salvageValue: z.coerce.number().min(0, { message: "Salvage value must be a positive number." }).optional(),

  // Classification
  status: z.string().default("ACTIVE"),
  location: z.string().optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  supplier: z.string().optional(),

  // Maintenance & Warranty
  warrantyExpiry: z.date().optional(),
  lastMaintenance: z.date().optional(),
  nextMaintenance: z.date().optional(),

  // Depreciation
  depreciationMethod: z.string().optional(),
  usefulLifeMonths: z.coerce.number().min(1, { message: "Useful life must be at least 1 month." }).optional(),
  depreciationStartDate: z.date().optional(),
})

type AssetFormValues = z.infer<typeof assetFormSchema>

interface AssetFormProps {
  initialData?: Partial<AssetFormValues>
  isEditing?: boolean
  assetId?: string
}

export function AssetForm({ initialData, isEditing = false, assetId }: AssetFormProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedTabs, setCompletedTabs] = useState<string[]>([])
  const [isCheckingSerial, setIsCheckingSerial] = useState(false)
  const router = useRouter()

  // Define the tab order for sequential navigation
  const tabOrder = ["basic", "financial", "classification", "maintenance"]

  // Convert date strings to Date objects for the form
  const formattedInitialData = initialData
    ? {
        ...initialData,
        purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate as unknown as string) : undefined,
        warrantyExpiry: initialData.warrantyExpiry ? new Date(initialData.warrantyExpiry as unknown as string) : undefined,
        lastMaintenance: initialData.lastMaintenance ? new Date(initialData.lastMaintenance as unknown as string) : undefined,
        nextMaintenance: initialData.nextMaintenance ? new Date(initialData.nextMaintenance as unknown as string) : undefined,
        depreciationStartDate: initialData.depreciationStartDate ? new Date(initialData.depreciationStartDate as unknown as string) : undefined,
      }
    : {}

  const defaultValues: Partial<AssetFormValues> = {
    status: "ACTIVE",
    purchaseDate: new Date(),
    ...formattedInitialData,
  }

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
    mode: "onChange" // Enable validation on change
  })

  // Get the current serial number value and debounce it
  const serialNumber = form.watch("serialNumber")
  const [debouncedSerialNumber] = useDebounce(serialNumber, 500) // 500ms delay

  // Check for duplicate serial number as user types
  useEffect(() => {
    // Skip empty values, initial render, and when editing with unchanged value
    if (!debouncedSerialNumber ||
        (isEditing && initialData?.serialNumber === debouncedSerialNumber)) {
      return
    }

    const validateSerialNumber = async () => {
      setIsCheckingSerial(true)
      try {
        const exists = await checkSerialNumber(debouncedSerialNumber)
        if (exists) {
          form.setError('serialNumber', {
            type: 'manual',
            message: 'This serial number is already in use. Please enter a unique serial number.'
          })
        } else {
          // Clear the error if it was previously set
          form.clearErrors('serialNumber')
        }
      } catch (error) {
        console.error("Error validating serial number:", error)
      } finally {
        setIsCheckingSerial(false)
      }
    }

    validateSerialNumber()
  }, [debouncedSerialNumber, isEditing, initialData?.serialNumber])

  // Navigation functions with validation
  const goToNextTab = async () => {
    const currentIndex = tabOrder.indexOf(activeTab)
    if (currentIndex < tabOrder.length - 1) {
      // Validate current tab fields before proceeding
      let isValid = true

      // Define which fields to validate for each tab
      const fieldsToValidate = {
        basic: ["name", "serialNumber"],
        financial: ["purchaseDate", "purchasePrice", "currentValue"],
        classification: ["status"],
        maintenance: [] // No required fields in the last tab
      }

      // Get the fields for the current tab
      const currentTabFields = fieldsToValidate[activeTab as keyof typeof fieldsToValidate]

      // Trigger validation for the current tab's fields
      if (currentTabFields.length > 0) {
        const result = await form.trigger(currentTabFields as any)
        isValid = result
      }

      if (isValid) {
        // Mark the current tab as completed
        if (!completedTabs.includes(activeTab)) {
          setCompletedTabs(prev => [...prev, activeTab])
        }

        // Move to the next tab
        setActiveTab(tabOrder[currentIndex + 1])

        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        // Show a toast message if validation fails
        toast.error("Please fill in all required fields before proceeding")
      }
    }
  }

  const goToPreviousTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1])
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Check if current tab is the first or last
  const isFirstTab = activeTab === tabOrder[0]
  const isLastTab = activeTab === tabOrder[tabOrder.length - 1]

  // Function to check if serial number already exists
  const checkSerialNumber = async (serialNumber: string): Promise<boolean> => {
    try {
      // Skip check if we're editing and the serial number hasn't changed
      if (isEditing && initialData?.serialNumber === serialNumber) {
        return false
      }

      const response = await fetch(`/api/assets/check-serial?serialNumber=${encodeURIComponent(serialNumber)}`)
      const data = await response.json()
      return data.exists
    } catch (error) {
      console.error("Error checking serial number:", error)
      return false
    }
  }

  async function onSubmit(data: AssetFormValues) {
    setIsSubmitting(true)
    try {
      // Check if serial number exists before submitting
      const serialExists = await checkSerialNumber(data.serialNumber)
      if (serialExists) {
        form.setError('serialNumber', {
          type: 'manual',
          message: 'This serial number is already in use. Please enter a unique serial number.'
        })

        // Show error toast
        toast.error('Serial number must be unique')

        // Navigate to the basic info tab if needed
        if (activeTab !== 'basic') {
          setActiveTab('basic')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }

        setIsSubmitting(false)
        return
      }

      const endpoint = isEditing ? `/api/assets/${assetId}` : '/api/assets'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Check for Prisma unique constraint error (P2002)
        if (errorData?.code === 'P2002' ||
            errorData?.error?.code === 'P2002' ||
            (errorData?.error && typeof errorData.error === 'string' &&
             (errorData.error.toLowerCase().includes('unique constraint') ||
              errorData.error.toLowerCase().includes('serial')))) {

          // Focus on the serial number field
          form.setError('serialNumber', {
            type: 'manual',
            message: errorData?.message || 'This serial number is already in use. Please enter a unique serial number.'
          })

          // Show error toast with more specific message
          toast.error(errorData?.message || 'Serial number must be unique', {
            duration: 5000, // Show for 5 seconds
            style: {
              border: '1px solid #f87171',
              padding: '16px',
              color: '#ef4444',
            },
            icon: '⚠️',
          })

          // If we're in a different tab, navigate to the basic info tab
          if (activeTab !== 'basic') {
            setActiveTab('basic')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } else {
          throw new Error(isEditing ? 'Failed to update asset' : 'Failed to create asset')
        }
        return
      }

      toast.success(isEditing ? 'Asset updated successfully' : 'Asset created successfully')
      router.push('/assets')
      router.refresh()
    } catch (error) {
      toast.error(isEditing ? 'Failed to update asset' : 'Failed to create asset')
      console.error(isEditing ? 'Error updating asset:' : 'Error creating asset:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate progress percentage
  const currentStepIndex = tabOrder.indexOf(activeTab)
  const progressPercentage = ((currentStepIndex + 1) / tabOrder.length) * 100

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStepIndex + 1} of {tabOrder.length}</span>
            <span className="text-sm font-medium">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger
              value="basic"
              className={cn(
                activeTab === "basic" ? "font-bold" : "",
                completedTabs.includes("basic") ? "text-green-600 border-green-600" : ""
              )}
            >
              {completedTabs.includes("basic") ? "✓ " : "1. "}
              Basic Information
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className={cn(
                activeTab === "financial" ? "font-bold" : "",
                completedTabs.includes("financial") ? "text-green-600 border-green-600" : ""
              )}
            >
              {completedTabs.includes("financial") ? "✓ " : "2. "}
              Financial Details
            </TabsTrigger>
            <TabsTrigger
              value="classification"
              className={cn(
                activeTab === "classification" ? "font-bold" : "",
                completedTabs.includes("classification") ? "text-green-600 border-green-600" : ""
              )}
            >
              {completedTabs.includes("classification") ? "✓ " : "3. "}
              Classification
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className={cn(
                activeTab === "maintenance" ? "font-bold" : "",
                completedTabs.includes("maintenance") ? "text-green-600 border-green-600" : ""
              )}
            >
              {completedTabs.includes("maintenance") ? "✓ " : "4. "}
              Maintenance & Depreciation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the essential details about this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter asset name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="Enter serial number" {...field} />
                        </FormControl>
                        {isCheckingSerial && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <FormDescription>
                        This must be unique across all assets.
                        {form.formState.errors.serialNumber ? (
                          <span className="text-red-500 ml-1">
                            {form.formState.errors.serialNumber.message}
                          </span>
                        ) : null}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a detailed description of the asset"
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousTab}
                disabled={isFirstTab}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
                <CardDescription>Enter the financial information for this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="depreciableCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className="flex items-center gap-2">
                            Depreciable Cost
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The cost basis for depreciation calculations.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salvageValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className="flex items-center gap-2">
                            Salvage Value
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Estimated value at the end of useful life.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousTab}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="classification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
                <CardDescription>Categorize this asset for better organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="MAINTENANCE">In Maintenance</SelectItem>
                          <SelectItem value="DISPOSED">Disposed</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset location" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Department" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset category" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset type" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier name" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousTab}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
              >
                Next
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance & Warranty</CardTitle>
                <CardDescription>Track maintenance schedules and warranty information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="warrantyExpiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Warranty Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="lastMaintenance"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Last Maintenance Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextMaintenance"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Next Maintenance Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Depreciation</CardTitle>
                <CardDescription>Set up depreciation parameters for this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="depreciationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depreciation Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                          <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                          <SelectItem value="DOUBLE_DECLINING">Double Declining</SelectItem>
                          <SelectItem value="SUM_OF_YEARS_DIGITS">Sum of Years Digits</SelectItem>
                          <SelectItem value="UNITS_OF_PRODUCTION">Units of Production</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="usefulLifeMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Useful Life (Months)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter months" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depreciationStartDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Depreciation Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousTab}
              >
                Previous
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Asset' : 'Create Asset'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Only show these buttons on the first three tabs */}
        {!isLastTab && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/assets')}>
              Cancel
            </Button>
            <Button type="button" onClick={goToNextTab}>
              Continue
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
