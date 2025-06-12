"use client"

import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format, isValid } from "date-fns"
import { useDebounce } from "use-debounce"
import { CheckCircle } from "lucide-react"

// Define custom icon components instead of using lucide-react
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

const ASSET_CATEGORIES = [
  "Electronics",
  "Buildings",
  "Furniture",
  "Vehicles",
  "Machinery",
  "IT Equipment",
  "Office Equipment",
  "Tools",
  "Security Equipment",
  "Land",
  "Other"
] as const;

const assetFormSchema = z.object({
  // Basic Information
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional().nullable(),
  serialNumber: z.string().min(1, { message: "Serial number is required." }),

  // Financial Information
  purchaseDate: z.date({
    required_error: "Purchase date is required.",
    invalid_type_error: "Please select a valid date.",
  }).refine((date) => isValid(date), {
    message: "Please select a valid date.",
  }),
  purchasePrice: z.coerce.number().min(0, { message: "Purchase price must be a positive number." }),
  currentValue: z.coerce.number().min(0, { message: "Current value must be a positive number." }).optional(),
  depreciableCost: z.coerce.number().min(0, { message: "Depreciable cost must be a positive number." }).optional(),

  // Classification
  status: z.string().default("ACTIVE"),
  location: z.string().optional().nullable(),
  department: z.string().default("Zemen Bank"), // This is now used as Company Name
  category: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),

  // Maintenance & Warranty
  warrantyExpiry: z.date({
    invalid_type_error: "Please select a valid date.",
  }).optional().nullable().refine((date) => !date || isValid(date), {
    message: "Please select a valid date.",
  }),
  lastMaintenance: z.date({
    invalid_type_error: "Please select a valid date.",
  }).optional().nullable().refine((date) => !date || isValid(date), {
    message: "Please select a valid date.",
  }),
  nextMaintenance: z.date({
    invalid_type_error: "Please select a valid date.",
  }).optional().nullable().refine((date) => !date || isValid(date), {
    message: "Please select a valid date.",
  }),

  // Depreciation
  depreciationMethod: z.string().optional().nullable(),
  usefulLifeMonths: z.coerce.number().min(1, { message: "Useful life must be at least 1 month." }).optional().nullable(),
  depreciationStartDate: z.date({
    invalid_type_error: "Please select a valid date.",
  }).optional().nullable().refine((date) => !date || isValid(date), {
    message: "Please select a valid date.",
  }),
  salvageValue: z.coerce.number().min(0, { message: "Salvage value must be a positive number." }).optional().nullable(),
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

  // Log the initial data to see what's coming in
  console.log("Initial Asset Data:", initialData);

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
    department: "Zemen Bank", // Set default department to Zemen Bank
    ...formattedInitialData,
  }

  // Log the formatted data and default values
  console.log("Formatted Initial Data:", formattedInitialData);
  console.log("Form Default Values:", defaultValues);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
    mode: "onChange" // Enable validation on change
  })

  // Function to check if serial number already exists
  const checkSerialNumber = useCallback(async (serialNumber: string): Promise<boolean> => {
    try {
      // Skip check if serial number is empty or we're editing and the serial number hasn't changed
      if (!serialNumber || serialNumber.trim() === '' ||
          (isEditing && initialData?.serialNumber === serialNumber)) {
        return false
      }

      // For debugging - log the serial number being checked
      console.log("Checking serial number:", serialNumber)

      const response = await fetch(`/api/assets/check-serial?serialNumber=${encodeURIComponent(serialNumber)}`)
      if (!response.ok) {
        console.error("Serial check API error:", response.status, response.statusText)
        return false // Don't block submission if the API fails
      }

      const data = await response.json()
      console.log("Serial check response:", data)
      return data.exists === true // Explicitly check for true
    } catch (error) {
      console.error("Error checking serial number:", error)
      return false // Don't block submission if there's an error
    }
  }, [isEditing, initialData?.serialNumber])

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
  }, [debouncedSerialNumber, isEditing, initialData?.serialNumber, checkSerialNumber, form])

  // Navigation functions with validation
  const goToNextTab = async () => {
    const currentIndex = tabOrder.indexOf(activeTab)
    if (currentIndex < tabOrder.length - 1) {
      // Validate current tab fields before proceeding
      let isValid = true

      // Define which fields to validate for each tab
      const fieldsToValidate = {
        basic: ["name", "serialNumber"],
        financial: ["purchaseDate", "purchasePrice"],
        classification: ["status"],
        maintenance: [] // No required fields in the last tab
      }

      // Get the fields for the current tab
      const currentTabFields = fieldsToValidate[activeTab as keyof typeof fieldsToValidate]

      // Trigger validation for the current tab's fields
      if (currentTabFields.length > 0) {
        const result = await form.trigger(currentTabFields as Array<keyof AssetFormValues>)
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

  async function onSubmit(data: AssetFormValues) {
    setIsSubmitting(true)
    try {
      // Log the form data being submitted
      console.log("Submitting form data:", data)

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

      // Proceed with submission if serial number is unique or check failed

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

  // Calculate progress based on filled fields
  const calculateProgress = () => {
    // Define required fields for each tab
    const tabFields = {
      basic: ["name", "serialNumber", "description"],
      financial: ["purchaseDate", "purchasePrice", "salvageValue"],
      classification: ["status", "location", "department", "category", "type"],
      maintenance: ["supplier", "warrantyExpiry"]
    };

    // Count total required fields and filled fields
    const totalFields = Object.values(tabFields).flat().length;
    let filledFields = 0;

    // Check each field if it has a value
    Object.values(tabFields).forEach(fields => {
      fields.forEach(field => {
        // Using type assertion for form values
        const value = form.getValues(field as keyof AssetFormValues);
        if (value &&
            (typeof value === 'string' ? value.trim() !== '' : true) &&
            (typeof value === 'number' ? !isNaN(value) : true)) {
          filledFields++;
        }
      });
    });

    // Calculate percentage
    return Math.round((filledFields / totalFields) * 100);
  };

  const progressPercentage = calculateProgress()
  const currentStepIndex = tabOrder.indexOf(activeTab)

  // In the AssetForm component, add this watch for category
  const selectedCategory = form.watch("category");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Enhanced Progress indicator */}
        <div className="mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-medium flex items-center text-gray-900 dark:text-gray-100">
              <span className="inline-flex items-center justify-center w-6 h-6 mr-2 bg-red-600 text-white rounded-full text-xs">
                {currentStepIndex + 1}
              </span>
              Step {currentStepIndex + 1} of {tabOrder.length}
            </span>
            <span className="text-sm font-medium flex items-center text-gray-900 dark:text-gray-100">
              <span className={`mr-2 ${progressPercentage > 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {Math.round(progressPercentage)}% Complete
              </span>
              {progressPercentage === 100 && (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-in-out ${
                progressPercentage < 30 ? 'bg-red-400 dark:bg-red-500' :
                progressPercentage < 70 ? 'bg-red-600 dark:bg-red-400' :
                progressPercentage === 100 ? 'bg-red-600 dark:bg-red-500 animate-pulse' : 'bg-red-600 dark:bg-red-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs mt-2 flex justify-between">
            <span className="text-gray-500">Fill in more fields to increase your progress</span>
            {/* <span className={cn(
              "font-medium",
              progressPercentage < 30 ? "text-blue-500" :
              progressPercentage < 70 ? "text-blue-600" :
              progressPercentage === 100 ? "text-green-600 font-bold" : "text-green-600"
            )}>
              {progressPercentage === 100 ? "✓ Complete!" : `${progressPercentage}% Complete`}
            </span> */}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {tabOrder.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
                  "data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100",
                  "data-[state=active]:shadow-sm",
                  "text-gray-600 dark:text-gray-400",
                  "rounded-md px-3 py-2 text-sm font-medium transition-all",
                  "hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {completedTabs.includes(tab) && (
                  <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card className="border shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/50 dark:to-red-800">
                <CardTitle className="text-[#000000] dark:text-[#ffffff]">Basic Information</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Enter the essential details about this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">Asset Name </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter asset name"
                          {...field}
                          value={field.value || ""}
                          className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
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
                      <FormLabel className="text-gray-900 dark:text-gray-100">Asset Tag ID *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="Enter serial number"
                            {...field}
                            value={field.value || ""}
                            className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </FormControl>
                        {isCheckingSerial && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-red-500 dark:border-red-400 rounded-full border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <FormDescription className="text-gray-600 dark:text-gray-400">
                        This must be unique across all assets.
                        {form.formState.errors.serialNumber ? (
                          <span className="text-red-500 dark:text-red-400 ml-1">
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
                      <FormLabel className="text-gray-900 dark:text-gray-100">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a detailed description of the asset"
                          className="min-h-[120px] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            <div className="flex justify-end gap-4">
            <Button
                type="button"
                onClick={goToNextTab}
                className="bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card className="border border-green-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-green-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/50 dark:to-red-800">
                <CardTitle className="text-[#000000] dark:text-[#ffffff]">Financial Details</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Enter the financial information for this asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900 dark:text-gray-100">Purchase Date *</FormLabel>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-red-500" aria-hidden="true" />
                          </div>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? new Date(value) : null);
                              }}
                              className="pl-10 transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                          </FormControl>
                        </div>
                        <FormDescription>The date when the asset was purchased</FormDescription>
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                            className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
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
                className="border-red-200 text-red-700 hover:bg-red-50 dark:hover:bg-red-600 dark:hover:text-red-200 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Previous
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="classification" className="space-y-6">
            <Card className="border border-red-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-red-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/50 dark:to-red-800">
                <CardTitle className="text-[#000000] dark:text-[#ffffff]">Classification</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Categorize this asset for better organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "ACTIVE"}>
                        <FormControl>
                          <SelectTrigger className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border-red-200 dark:border-red-800 shadow-lg bg-white dark:bg-gray-800 rounded-lg p-1">
                          <SelectItem value="ACTIVE" className="hover:bg-red-100 dark:hover:bg-red-900 focus:bg-red-100 dark:focus:bg-red-900 rounded-md my-1 cursor-pointer text-gray-900 dark:text-gray-100">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                              Active
                            </div>
                          </SelectItem>
                          {/* <SelectItem value="UNDER_MAINTENANCE" className="hover:bg-purple-100 dark:hover:bg-purple-900 focus:bg-purple-100 dark:focus:bg-purple-900 rounded-md my-1 cursor-pointer text-gray-900 dark:text-gray-100">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                              Under Maintenance
                            </div>
                          </SelectItem>
                          <SelectItem value="DISPOSED" className="hover:bg-purple-100 dark:hover:bg-purple-900 focus:bg-purple-100 dark:focus:bg-purple-900 rounded-md my-1 cursor-pointer text-gray-900 dark:text-gray-100">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Disposed
                            </div>
                          </SelectItem> */}
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
                          <Input
                            placeholder="Asset location"
                            {...field}
                            value={field.value || ""}
                            className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
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
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Input
                              placeholder="Company Name"
                              {...field}
                              value="Zemen Bank"
                              disabled={true}
                              className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="ml-2 cursor-help">
                                    <InfoIcon className="h-4 w-4 text-red-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>All assets belong to Zemen Bank</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                        <FormLabel className="text-gray-900 dark:text-gray-100">Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="border-red-200 dark:border-red-800 shadow-lg bg-white dark:bg-gray-800 rounded-lg p-1 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-300 dark:scrollbar-thumb-red-700 scrollbar-track-red-50 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-red-400 dark:hover:scrollbar-thumb-red-600">
                            {ASSET_CATEGORIES.map((category) => (
                              <SelectItem 
                                key={category} 
                                value={category}
                                className="hover:bg-red-100 dark:hover:bg-red-900 focus:bg-red-100 dark:focus:bg-red-900 rounded-md my-1 cursor-pointer text-gray-900 dark:text-gray-100"
                              >
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                  {category}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Select the asset category</FormDescription>
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
                        <Input
                          placeholder="Supplier name"
                          {...field}
                          value={field.value || ""}
                          className="transition-all duration-300 hover:border-red-300 dark:hover:border-red-700 focus:shadow-md transform focus:translate-y-[-2px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="border-red-200 text-red-700 hover:bg-red-50 dark:hover:bg-red-600 dark:hover:text-red-200 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Previous
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card className="border border-red-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-red-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/50 dark:to-red-800">
                <CardTitle className="text-[#000000] dark:text-[#ffffff]">Warranty</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Track warranty information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="warrantyExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">Warranty Expiry Date</FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </div>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? new Date(value) : null);
                            }}
                            className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>The date when the warranty expires</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastMaintenance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">Last Maintenance Date</FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </div>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? new Date(value) : null);
                            }}
                            className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>The date of the last maintenance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextMaintenance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">Next Maintenance Date</FormLabel>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </div>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? new Date(value) : null);
                            }}
                            className="pl-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>The date of the next scheduled maintenance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Update the depreciation card to be conditionally rendered */}
            {selectedCategory !== "Land" && (
            <Card className="border border-red-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-red-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/50 dark:to-red-800">
                <CardTitle className="text-[#000000] dark:text-[#ffffff]">Depreciation</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Set up depreciation parameters for this asset.</CardDescription>
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
                          <SelectTrigger className="border-red-200 focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent className="border-red-200 shadow-lg bg-gradient-to-br from-red-50 to-white rounded-lg p-1 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-300 scrollbar-track-red-50 hover:scrollbar-thumb-red-400">
                          <SelectItem value="STRAIGHT_LINE" className="hover:bg-red-100 focus:bg-red-100 rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Straight Line
                            </div>
                          </SelectItem>
                          <SelectItem value="DECLINING_BALANCE" className="hover:bg-red-100 focus:bg-red-100 rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Declining Balance
                            </div>
                          </SelectItem>
                          <SelectItem value="DOUBLE_DECLINING" className="hover:bg-red-100 focus:bg-red-100 rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Double Declining
                            </div>
                          </SelectItem>
                          <SelectItem value="SUM_OF_YEARS_DIGITS" className="hover:bg-red-100 focus:bg-red-100 rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Sum of Years Digits
                            </div>
                          </SelectItem>
                          <SelectItem value="UNITS_OF_ACTIVITY" className="hover:bg-red-100 focus:bg-red-100 rounded-md my-1 cursor-pointer">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                              Units of Activity
                            </div>
                          </SelectItem>
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
                          <Input
                            type="number"
                            placeholder="Enter months"
                            {...field}
                            value={field.value || ""}
                            className="border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-all"
                          />
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
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value || ""}
                              className="border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="depreciationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depreciation Start Date</FormLabel>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                            <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? new Date(value) : null);
                              }}
                              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </FormControl>
                        </div>
                        <FormDescription>The date when depreciation begins</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousTab}
                className="border-red-200 text-red-700 hover:bg-red-50 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Previous
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg",
                  isSubmitting && "opacity-70 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    {isEditing ? 'Update Asset' : 'Create Asset'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Only show these buttons on the first three tabs
        {!isLastTab && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/assets')}>
              Cancel
            </Button>
            <Button type="button" onClick={goToNextTab}>
              Continue
            </Button>
          </div>
        )} */}
      </form>
    </Form>
  )
}
