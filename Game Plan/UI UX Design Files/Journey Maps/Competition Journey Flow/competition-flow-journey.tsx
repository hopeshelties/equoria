"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  Search,
  Calendar,
  ClipboardList,
  Award,
  Share2,
  User,
  Filter,
  Clock,
  Medal,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function EquoriaCompetitionFlow() {
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
      title: "Open Competitions Tab",
      icon: <Trophy className="h-6 w-6" />,
      action: 'User selects "Competitions" from the bottom nav',
      uxGoal: "Present an organized, filterable list of available shows",
      screen: 'Tabs for "Upcoming," "Entered," and "Past"; search filters for discipline, level, fee, and date',
      emotion: "Strategic interest, engagement",
      color: "bg-amber-100 dark:bg-amber-950",
      borderColor: "border-amber-300 dark:border-amber-800",
      emotionColor: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    {
      title: "Search & Filter",
      icon: <Search className="h-6 w-6" />,
      action: "Uses filters to find ideal shows for a horse's discipline and level",
      uxGoal: "Streamline matching the right horse to the right event",
      screen: "Filter toggles and dropdowns; results update dynamically",
      emotion: "Focus, anticipation",
      color: "bg-blue-100 dark:bg-blue-950",
      borderColor: "border-blue-300 dark:border-blue-800",
      emotionColor: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    {
      title: "Enter a Competition",
      icon: <Calendar className="h-6 w-6" />,
      action: 'Taps "Enter Show," selects eligible horse(s), confirms entry',
      uxGoal: "Clear requirements, no guesswork",
      screen: "Show summary card with rules, prize pot, and entry cost",
      emotion: "Motivation, satisfaction",
      color: "bg-emerald-100 dark:bg-emerald-950",
      borderColor: "border-emerald-300 dark:border-emerald-800",
      emotionColor: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    },
    {
      title: "View Entered Shows",
      icon: <ClipboardList className="h-6 w-6" />,
      action: 'Navigates to "Entered" tab to see all current submissions',
      uxGoal: "Reinforce sense of progress and planning",
      screen: "List of entered events with countdowns to results",
      emotion: "Anticipation, control",
      color: "bg-purple-100 dark:bg-purple-950",
      borderColor: "border-purple-300 dark:border-purple-800",
      emotionColor: "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    },
    {
      title: "Results Processing (next day)",
      icon: <Award className="h-6 w-6" />,
      action: 'Checks results from the "Past" tab or Dashboard notification',
      uxGoal: "Deliver rewarding, animated feedback",
      screen: "Rank, prize, earnings, updated stats if applicable",
      emotion: "Pride, dopamine hit",
      color: "bg-rose-100 dark:bg-rose-950",
      borderColor: "border-rose-300 dark:border-rose-800",
      emotionColor: "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    },
    {
      title: "Share or Replay",
      icon: <Share2 className="h-6 w-6" />,
      action: 'Optional link to "View Results Summary" or share a win',
      uxGoal: "Extend emotional engagement",
      screen: "Result card with horse portrait, stats, and performance graph",
      emotion: "Celebration, nostalgia",
      color: "bg-indigo-100 dark:bg-indigo-950",
      borderColor: "border-indigo-300 dark:border-indigo-800",
      emotionColor: "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-rose-600">
          Equoria User Journey Map
        </h1>
        <p className="text-lg text-muted-foreground">Competition Entry and Results Flow</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>Target user for Equoria's competition flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="flex-[2]">
              <h3 className="text-xl font-semibold">Millennial Nostalgic Stable Owner</h3>
              <p className="text-muted-foreground mb-2">Age: 30–40</p>
              <p className="mb-4">
                <strong>Goal:</strong> Enter her horses into the right competitions, win prizes, and track progress.
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
          <h2 className="text-2xl font-bold mb-6">Competition Interface</h2>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-amber-500" /> Competitions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-none">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="entered">Entered</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <div className="p-3 border-b">
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="Search competitions..." className="h-8" />
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Disciplines</SelectItem>
                        <SelectItem value="dressage">Dressage</SelectItem>
                        <SelectItem value="jumping">Show Jumping</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <TabsContent value="upcoming" className="m-0">
                  <div className="p-3 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-sm">Spring Dressage Classic</h3>
                        <p className="text-xs text-muted-foreground">Intermediate • $500 Prize</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> 2d
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                        Enter Show
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-sm">Summer Jumping Cup</h3>
                        <p className="text-xs text-muted-foreground">Advanced • $1,200 Prize</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> 5d
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                        Enter Show
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="entered" className="m-0">
                  <div className="p-3 border-b">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-medium text-sm">Winter Trot</h3>
                        <p className="text-xs text-muted-foreground">Beginner • Midnight Star</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Results tomorrow
                      </Badge>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="past" className="m-0">
                  <div className="p-3 border-b">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-medium text-sm">Fall Equestrian Games</h3>
                        <p className="text-xs text-muted-foreground">Intermediate • Thunder</p>
                      </div>
                      <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-xs">
                        <Medal className="h-3 w-3 mr-1" /> 1st Place
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Share2 className="h-3 w-3 mr-1" /> Share
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-3 text-white">
              <div className="flex items-center">
                <Trophy className="h-6 w-6 mr-2" />
                <h3 className="font-bold">Competition Results</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <Badge className="text-lg px-4 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  1st Place
                </Badge>
                <h3 className="font-bold mt-2">Fall Equestrian Games</h3>
                <p className="text-sm text-muted-foreground">Intermediate Dressage</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Horse</p>
                  <p className="font-medium">Thunder</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Prize</p>
                  <p className="font-medium">$800</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-medium">87.5</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Stat Gain</p>
                  <p className="font-medium text-emerald-600">+2 Dressage</p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button size="sm" variant="outline" className="text-xs">
                  View Details
                </Button>
                <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                  <Share2 className="h-3 w-3 mr-1" /> Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Competition Flow Visualization</CardTitle>
          <CardDescription>From discovery to results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Discovery Phase */}
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <h3 className="font-bold text-amber-600 dark:text-amber-400">Discovery Phase</h3>
                    </div>
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-2">
                        <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-300" />
                      </div>
                      <span className="text-xs text-center">Open Competitions</span>
                      <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700 my-2"></div>
                      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                        <Search className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                      </div>
                      <span className="text-xs text-center">Search & Filter</span>
                    </div>
                  </div>

                  {/* Entry Phase */}
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <h3 className="font-bold text-emerald-600 dark:text-emerald-400">Entry Phase</h3>
                    </div>
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                        <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <span className="text-xs text-center">Enter Competition</span>
                      <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700 my-2"></div>
                      <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                        <ClipboardList className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                      </div>
                      <span className="text-xs text-center">View Entered Shows</span>
                    </div>
                  </div>

                  {/* Results Phase */}
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <h3 className="font-bold text-rose-600 dark:text-rose-400">Results Phase</h3>
                    </div>
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-2">
                        <Award className="h-8 w-8 text-rose-600 dark:text-rose-300" />
                      </div>
                      <span className="text-xs text-center">Results Processing</span>
                      <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-700 my-2"></div>
                      <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-2">
                        <Share2 className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <span className="text-xs text-center">Share Results</span>
                    </div>
                  </div>
                </div>

                {/* Connecting arrows */}
                <div className="hidden md:flex justify-between items-center mt-4">
                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="mx-4 text-sm text-muted-foreground">Progression Timeline</div>
                  <div className="h-0.5 flex-1 bg-gray-300 dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
