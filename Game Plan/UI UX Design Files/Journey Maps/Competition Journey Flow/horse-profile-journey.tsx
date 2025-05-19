"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  DogIcon as Horse,
  BarChart2,
  Play,
  Dumbbell,
  Heart,
  History,
  User,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EquoriaHorseProfile() {
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
      title: "Horse Profile Entry",
      icon: <Horse className="h-6 w-6" />,
      action: "User selects a horse from their stable list",
      uxGoal: "Present an immersive, emotionally satisfying overview of the horse",
      screen: "Horse image, name, breed, gender, age, conformation grade, active stats, key traits",
      emotion: "Affection, personalization",
      color: "bg-indigo-100 dark:bg-indigo-950",
      borderColor: "border-indigo-300 dark:border-indigo-800",
      emotionColor: "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    },
    {
      title: "Stat & Trait Review",
      icon: <BarChart2 className="h-6 w-6" />,
      action: "Scroll to view detailed stats (gameness, strength, endurance, etc.)",
      uxGoal: "Provide transparency and fuel strategic decisions",
      screen: "Horizontal bars or rating stars; visual flair for high stats",
      emotion: "Tactical curiosity, pride",
      color: "bg-amber-100 dark:bg-amber-950",
      borderColor: "border-amber-300 dark:border-amber-800",
      emotionColor: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    {
      title: "Action Buttons Interface",
      icon: <Play className="h-6 w-6" />,
      action: 'Tap "Train", "Breed", "Vet Check", or "Enter Competition"',
      uxGoal: "Enable quick action-taking in an intuitive layout",
      screen: "Fixed-position action bar or clearly labeled cards/buttons",
      emotion: "Confidence, empowerment",
      color: "bg-emerald-100 dark:bg-emerald-950",
      borderColor: "border-emerald-300 dark:border-emerald-800",
      emotionColor: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    },
    {
      title: "Training Interaction",
      icon: <Dumbbell className="h-6 w-6" />,
      action: "Choose discipline, select trainer, confirm training",
      uxGoal: "Make training feel impactful and satisfying",
      screen: "Progress animation, confirmation modal with result summary",
      emotion: "Progression, reward",
      color: "bg-blue-100 dark:bg-blue-950",
      borderColor: "border-blue-300 dark:border-blue-800",
      emotionColor: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    {
      title: "Breeding Interaction (if eligible)",
      icon: <Heart className="h-6 w-6" />,
      action: "Pair with a compatible mate, view trait predictions (if available)",
      uxGoal: "Encourage thoughtful lineage planning",
      screen: "Mate preview, foal prediction, confirmation flow",
      emotion: "Excitement, anticipation",
      color: "bg-rose-100 dark:bg-rose-950",
      borderColor: "border-rose-300 dark:border-rose-800",
      emotionColor: "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    },
    {
      title: "Show & Training History",
      icon: <History className="h-6 w-6" />,
      action: "Scroll down to see show results, training logs, and lineage history",
      uxGoal: "Create a sense of legacy and achievement",
      screen: "Timeline or accordion-style log",
      emotion: "Reflection, pride, narrative connection",
      color: "bg-purple-100 dark:bg-purple-950",
      borderColor: "border-purple-300 dark:border-purple-800",
      emotionColor: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    {
      title: "Return to Stable",
      icon: <ChevronLeft className="h-6 w-6" />,
      action: 'Tap "Back to Stable"',
      uxGoal: "Ensure a cohesive loop between stable overview and horse detail",
      screen: "Returns user to same scroll position in stable",
      emotion: "Completion, control",
      color: "bg-gray-100 dark:bg-gray-900",
      borderColor: "border-gray-300 dark:border-gray-700",
      emotionColor: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-rose-600">
          Equoria User Journey Map
        </h1>
        <p className="text-lg text-muted-foreground">Horse Profile Interaction Flow</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>Target user for Equoria's horse profile interaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-rose-500 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="flex-[2]">
              <h3 className="text-xl font-semibold">Millennial Nostalgic Stable Owner</h3>
              <p className="text-muted-foreground mb-2">Age: 30–40</p>
              <p className="mb-4">
                <strong>Goal:</strong> Deepen their relationship with individual horses and improve performance through
                strategic interactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-2">
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
                        {expandedStage === index ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
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
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Horse Profile Preview</h2>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-40 flex items-center justify-center">
              <Horse className="h-20 w-20 text-white" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Midnight Star</CardTitle>
                  <CardDescription>Arabian • Mare • 5 years</CardDescription>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Grade A
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="stats">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="traits">Traits</TabsTrigger>
                </TabsList>
                <TabsContent value="stats" className="space-y-3 pt-3">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Speed</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Endurance</span>
                      <span>70%</span>
                    </div>
                    <Progress value={70} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Agility</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                </TabsContent>
                <TabsContent value="traits" className="pt-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Spirited</Badge>
                    <Badge variant="secondary">Intelligent</Badge>
                    <Badge variant="secondary">Loyal</Badge>
                    <Badge variant="secondary">Competitive</Badge>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Dumbbell className="mr-2 h-4 w-4" /> Train
                </Button>
                <Button className="bg-rose-600 hover:bg-rose-700">
                  <Heart className="mr-2 h-4 w-4" /> Breed
                </Button>
                <Button variant="outline">Vet Check</Button>
                <Button variant="outline">Competition</Button>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="ghost" size="sm">
                <History className="mr-2 h-4 w-4" /> History
              </Button>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Stable
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Interaction Flow Visualization</CardTitle>
          <CardDescription>Horse profile interaction sequence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-md">
                <div className="flex flex-col items-center">
                  {/* Entry point */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-2">
                      <Horse className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <span className="text-xs text-center">Profile Entry</span>
                  </div>

                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                  {/* Stats review */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-2">
                      <BarChart2 className="h-8 w-8 text-amber-600 dark:text-amber-300" />
                    </div>
                    <span className="text-xs text-center">Stats Review</span>
                  </div>

                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                  {/* Action buttons */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                      <Play className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <span className="text-xs text-center">Action Selection</span>
                  </div>

                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                  {/* Branching paths */}
                  <div className="grid grid-cols-2 gap-16 mb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                        <Dumbbell className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                      </div>
                      <span className="text-xs text-center">Training</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-2">
                        <Heart className="h-8 w-8 text-rose-600 dark:text-rose-300" />
                      </div>
                      <span className="text-xs text-center">Breeding</span>
                    </div>
                  </div>

                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                  {/* History */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                      <History className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                    </div>
                    <span className="text-xs text-center">History Review</span>
                  </div>

                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700"></div>

                  {/* Return */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                      <ChevronLeft className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-xs text-center">Return to Stable</span>
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
