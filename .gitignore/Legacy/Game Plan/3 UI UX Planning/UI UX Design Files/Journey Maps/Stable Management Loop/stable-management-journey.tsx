"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Home, Filter, DogIcon as Horse, Apple, Dumbbell, Heart, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function EquoriaStableManagement() {
  const [expandedStage, setExpandedStage] = useState<number | null>(null)

  const toggleStage = (index: number) => {
    if (expandedStage === index) {
      setExpandedStage(null)
    } else {
      setExpandedStage(index)
    }
  }

  const stages = [
    {
      title: "Stable Dashboard Entry",
      icon: <Home className="h-6 w-6" />,
      action: 'User taps the "Stable" tab from the bottom nav bar',
      uxGoal: "Provide an instant, organized overview of their stable",
      screen: "Displays stable name, optional profile image, sections for All Horses, Mares, Stallions, Foals, Retired",
      emotion: "Ownership, nostalgic satisfaction",
      color: "bg-emerald-100 dark:bg-emerald-950",
      borderColor: "border-emerald-300 dark:border-emerald-800",
      emotionColor: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    },
    {
      title: "Feed & Care Check",
      icon: <Apple className="h-6 w-6" />,
      action: "User scans the list/grid of horses for care status indicators (hunger, training due, etc.)",
      uxGoal: "Encourage daily login and light maintenance loops",
      screen: '"Feed All" option if feed is pre-assigned; individual horse cards show care icons',
      emotion: "Routine, nurturing responsibility",
      color: "bg-amber-100 dark:bg-amber-950",
      borderColor: "border-amber-300 dark:border-amber-800",
      emotionColor: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    {
      title: "Training Status Review",
      icon: <Dumbbell className="h-6 w-6" />,
      action: "User reviews which horses are ready for weekly training",
      uxGoal: "Motivate consistent progression",
      screen: '"Train Now" CTA next to eligible horses; hover/click shows recent training history',
      emotion: "Productivity, long-term growth",
      color: "bg-blue-100 dark:bg-blue-950",
      borderColor: "border-blue-300 dark:border-blue-800",
      emotionColor: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    {
      title: "Breeding Review (if applicable)",
      icon: <Heart className="h-6 w-6" />,
      action: "User checks on mares in foal and stallions listed for stud",
      uxGoal: "Reinforce progression and future planning",
      screen: "Timer for foal birth, preview of expected traits (if genetic testing done)",
      emotion: "Anticipation, strategic planning",
      color: "bg-rose-100 dark:bg-rose-950",
      borderColor: "border-rose-300 dark:border-rose-800",
      emotionColor: "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    },
    {
      title: "Filtering & Sorting",
      icon: <Filter className="h-6 w-6" />,
      action: "Use filters to view horses by training status, age, breed, or stats",
      uxGoal: "Empower efficient management of large stables",
      screen: "Top bar filter toggles; ability to favorite/star key horses",
      emotion: "Control, organization, delight",
      color: "bg-purple-100 dark:bg-purple-950",
      borderColor: "border-purple-300 dark:border-purple-800",
      emotionColor: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    {
      title: "Navigate to Horse Profile",
      icon: <Horse className="h-6 w-6" />,
      action: "Taps on a specific horse to open its profile",
      uxGoal: "Smooth transition to detailed, immersive view",
      screen: "Loads horse profile in new screen",
      emotion: "Connection, curiosity",
      color: "bg-teal-100 dark:bg-teal-950",
      borderColor: "border-teal-300 dark:border-teal-800",
      emotionColor: "bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-blue-600">
          Equoria User Journey Map
        </h1>
        <p className="text-lg text-muted-foreground">Stable Management Loop</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>Target user for Equoria's stable management experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="flex-[2]">
              <h3 className="text-xl font-semibold">Millennial Nostalgic Stable Owner</h3>
              <p className="text-muted-foreground mb-2">Age: 30–40</p>
              <p className="mb-4">
                <strong>Goal:</strong> Build and manage a competitive, personalized stable with daily engagement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold mb-6">Journey Stages</h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={index} className={`relative ${expandedStage === index ? "z-10" : "z-0"}`}>
              <Card
                className={`border-l-4 transition-all duration-300 ${stage.borderColor} ${expandedStage === index ? "shadow-lg" : ""}`}
              >
                <div className="p-4 flex items-center cursor-pointer" onClick={() => toggleStage(index)}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${stage.color}`}>
                    {stage.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold flex items-center">
                      {index + 1}. {stage.title}
                    </h3>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-2">
                    {expandedStage === index ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>

                {expandedStage === index && (
                  <CardContent className={`border-t ${stage.color} p-4`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-1">Action</h4>
                        <p className="text-sm mb-3">{stage.action}</p>

                        <h4 className="font-medium mb-1">UX Goal</h4>
                        <p className="text-sm mb-3">{stage.uxGoal}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Screen</h4>
                        <p className="text-sm mb-3">{stage.screen}</p>

                        <h4 className="font-medium mb-1">Emotional Response</h4>
                        <Badge className={`font-normal ${stage.emotionColor}`}>{stage.emotion}</Badge>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gameplay Loop Visualization</CardTitle>
          <CardDescription>Core stable management loop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                      <Home className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <span className="text-xs text-center">Stable Entry</span>
                  </div>

                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-2">
                      <Apple className="h-8 w-8 text-amber-600 dark:text-amber-300" />
                    </div>
                    <span className="text-xs text-center">Daily Care</span>
                  </div>

                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                      <Dumbbell className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <span className="text-xs text-center">Training</span>
                  </div>
                </div>

                <div className="w-0.5 h-16 bg-gray-300 dark:bg-gray-700 mx-auto"></div>

                <div className="flex justify-between items-center mt-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center mb-2">
                      <Horse className="h-8 w-8 text-teal-600 dark:text-teal-300" />
                    </div>
                    <span className="text-xs text-center">Horse Profile</span>
                  </div>

                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                      <Filter className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                    </div>
                    <span className="text-xs text-center">Sorting</span>
                  </div>

                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-2">
                      <Heart className="h-8 w-8 text-rose-600 dark:text-rose-300" />
                    </div>
                    <span className="text-xs text-center">Breeding</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
