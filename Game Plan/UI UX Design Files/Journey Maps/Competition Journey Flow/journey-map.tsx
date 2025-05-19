"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Gamepad2, Home, Info, Settings, ShoppingCart, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function EquoriaJourneyMap() {
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
      title: "App Launch",
      icon: <Gamepad2 className="h-6 w-6" />,
      action: "User opens Equoria app on phone or tablet",
      uxGoal: "Immediate nostalgic immersion",
      screen: "Animated logo splash with classic horse pixel-art and retro music sting",
      emotion: "Curiosity, excitement",
      color: "bg-purple-100 dark:bg-purple-950",
      borderColor: "border-purple-300 dark:border-purple-800",
      emotionColor: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    {
      title: "Welcome Screen",
      icon: <Home className="h-6 w-6" />,
      action: 'Click "Start" or "Login / Sign Up"',
      uxGoal: "Clean intro with retro-modern UI balance",
      screen: 'Welcome message, 2 options: "New Player' / 'Returning Player"',
      emotion: "Familiarity, simplicity",
      color: "bg-blue-100 dark:bg-blue-950",
      borderColor: "border-blue-300 dark:border-blue-800",
      emotionColor: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    {
      title: "Account Creation",
      icon: <User className="h-6 w-6" />,
      action: "New user enters username, email, password",
      uxGoal: "Quick, secure account creation",
      screen: "Mobile-friendly form with equestrian styling",
      notes: "Required: Age gate (must be 13+)",
      emotion: "Trust, anticipation",
      color: "bg-green-100 dark:bg-green-950",
      borderColor: "border-green-300 dark:border-green-800",
      emotionColor: "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    {
      title: "Starter Setup",
      icon: <Settings className="h-6 w-6" />,
      action: "Choose stable name, upload image (or use default), select first horse",
      uxGoal: "Personalization begins immediately",
      screen: "Dropdowns for breed, gender; horse preview image updates live",
      notes: "Horse stats generated upon confirmation",
      emotion: "Creativity, ownership",
      color: "bg-amber-100 dark:bg-amber-950",
      borderColor: "border-amber-300 dark:border-amber-800",
      emotionColor: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    {
      title: "Guided Tutorial Begins",
      icon: <Info className="h-6 w-6" />,
      action: "Short tutorial overlays walk user through dashboard, stable, and world tabs",
      uxGoal: "Confidence and ease of entry",
      screen: "Highlight important UI elements, introduce navigation patterns",
      emotion: "Empowerment, learning",
      color: "bg-rose-100 dark:bg-rose-950",
      borderColor: "border-rose-300 dark:border-rose-800",
      emotionColor: "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    },
    {
      title: "First Action Suggested",
      icon: <ShoppingCart className="h-6 w-6" />,
      action: "Prompt user to visit the Store and buy supplies or train horse",
      uxGoal: "Create momentum into core gameplay loop",
      screen: '"Let\'s get your first horse ready to compete!"',
      emotion: "Motivation, engagement",
      color: "bg-cyan-100 dark:bg-cyan-950",
      borderColor: "border-cyan-300 dark:border-cyan-800",
      emotionColor: "bg-cyan-200 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-rose-600">
          Equoria User Journey Map
        </h1>
        <p className="text-lg text-muted-foreground">Onboarding Flow</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>Target user for Equoria's onboarding experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="flex-[2]">
              <h3 className="text-xl font-semibold">Millennial Nostalgic Player</h3>
              <p className="text-muted-foreground mb-2">Age: 30–40</p>
              <p className="mb-4">
                <strong>Goal:</strong> Recapture the joy of classic horse sim games, create a stable, and get started
                quickly with her first horse.
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

                        {stage.notes && (
                          <>
                            <h4 className="font-medium mb-1">Notes</h4>
                            <p className="text-sm mb-3">{stage.notes}</p>
                          </>
                        )}

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
          <CardTitle>Success Criteria</CardTitle>
          <CardDescription>Metrics to evaluate successful onboarding</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>Account created</li>
            <li>Horse selected</li>
            <li>Stable named</li>
            <li>User introduced to all primary game sections</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
