'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useParams } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type Priority = "High" | "Medium" | "Low"

interface Issue {
  issue_key: number
  title: string
  priority: Priority
  description: string
  createdAt: string
  assignedBy: string
  projectKey: string
}

const priorityColors = {
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500"
}

export default function ProjectScreen() {
  const { projectKey } = useParams()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<'jira' | 'clickup'>('jira')

  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const endpoint = platform === 'jira' ? '/tickets/open/jira' : '/tickets/open/clickup'
        console.log(`Fetching from: ${endpoint}`);
        const response = await axios.post(`http://localhost:8000${endpoint}`, {
          project_key: projectKey,
        });
        console.log(response.data);

        const fetchedIssues = response.data.open_tickets || response.data.open_tasks;
        const issuesWithProjectKey = fetchedIssues.map((issue: Issue) => ({
          ...issue,
          projectKey: projectKey, 
        }));

        setIssues(issuesWithProjectKey);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.message || "Failed to fetch tickets.")
        } else {
          setError("Failed to fetch tickets.")
        }
      } finally {
        console.log("Loading finished");
        setLoading(false)
      }
    }

    fetchOpenTickets()
  }, [projectKey, platform])

  const handlePlatformChange = (selectedPlatform: 'jira' | 'clickup') => {
    setPlatform(selectedPlatform)
    setLoading(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#00172e] to-[#001030] text-white">
      <nav className="relative z-10 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-b border-white border-opacity-20 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl">SupportSync</span>
            </div>
            <div>
              <Button variant="ghost" onClick={() => handlePlatformChange('jira')}>JIRA</Button>
              <Button variant="ghost" onClick={() => handlePlatformChange('clickup')}>ClickUp</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto mt-10">
        <h1 className="text-3xl font-bold mb-10">{`${platform}/${projectKey}`}</h1>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-white" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {issues.map((issue) => (
                <Link
                  to={`/ticket/${issue.issue_key}`}
                  state={{ issue }}
                  key={issue.issue_key}
                >
                  <Card className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold text-white">{issue.title}</CardTitle>
                        <Badge className={`${priorityColors[issue.priority]} text-white`}>
                          {issue.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-300 mb-4">{issue.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Created: {new Date(issue.createdAt).toLocaleDateString()}</span>
                        <span>Assigned by: {issue.assignedBy}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
