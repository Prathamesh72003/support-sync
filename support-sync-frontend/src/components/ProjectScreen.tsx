"use client";

import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2, Plus, User, Users } from "lucide-react";
import NavBar from "@/components/NavBar";
import { API_BASE_URL_PROD } from "@/config/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Priority = "High" | "Medium" | "Low";
type Category =
  | "Platform & Infrastructure Failures"
  | "Automation & Communication Failures"
  | "Configuration & Customization Errors"
  | "Data & Integration Errors"
  | "Access & Security Challenges";

interface Issue {
  issue_key: number | string;
  title: string;
  priority: Priority;
  description: string;
  createdAt: string;
  Assignee: string;
  projectKey: string;
  issue_category?: Category;
  issue_stats?: string | number;
}

const priorityColors = {
  High: "bg-red-500/80 text-white border-red-600",
  Medium: "bg-amber-500/80 text-white border-amber-600",
  Low: "bg-emerald-500/80 text-white border-emerald-600",
};

const priorityIcons = {
  High: <AlertCircle className="w-3 h-3" />,
  Medium: <AlertCircle className="w-3 h-3" />,
  Low: <AlertCircle className="w-3 h-3" />,
};

const categoryIcons = {
  "Platform & Infrastructure Failures": "🖥️",
  "Automation & Communication Failures": "🤖",
  "Configuration & Customization Errors": "⚙️",
  "Data & Integration Errors": "🔗",
  "Access & Security Challenges": "🔒",
};

export default function ProjectScreen() {
  const { projectKey } = useParams();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platform] = useState<"jira" | "clickup">("jira");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    priority: Priority;
    issue_category?: Category;
    assigneeEmail?: string;
  }>({
    title: "",
    description: "",
    priority: "Medium",
    issue_category: "Platform & Infrastructure Failures",
    assigneeEmail: "",
  });

  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const endpoint =
          platform === "jira" ? "/tickets/open/jira" : "/tickets/open/clickup";
        const response = await axios.post(`${API_BASE_URL_PROD}${endpoint}`, {
          project_key: projectKey,
        });

        const fetchedIssues =
          response.data.open_tickets || response.data.open_tasks;

        const issuesWithProjectKey: Issue[] = fetchedIssues.map(
          (issue: any) => ({
            issue_key: issue.issue_key,
            title: issue.title,
            priority: issue.priority,
            description: issue.description,
            createdAt: issue.DateTime || new Date().toISOString(),
            Assignee: issue.Assignee || "Unassigned",
            projectKey: projectKey || "",
            issue_category:
              issue.issue_category || "Platform & Infrastructure Failures",
            issue_stats: issue.issue_stats ?? "-",
          })
        );

        setIssues(issuesWithProjectKey);
      } catch (err) {
        setError("Failed to fetch tickets.");
      } finally {
        setLoading(false);
      }
    };

    fetchOpenTickets();
  }, [projectKey, platform]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewTicket((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setNewTicket((prev) => ({ ...prev, issue_category: value as Category }));
  };

  const handlePriorityChange = (value: string) => {
    setNewTicket((prev) => ({ ...prev, priority: value as Priority }));
  };

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    if (newTicket.assigneeEmail && !emailRegex.test(newTicket.assigneeEmail)) {
      setSubmitError("Please enter a valid email address for the assignee.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);

    try {
      const resp = await axios.post(
        `${API_BASE_URL_PROD}/tickets/create/jira`,
        {
          project_key: projectKey,
          summary: newTicket.title,
          description: newTicket.description,
          level: newTicket.priority,
          category_value: newTicket.issue_category,
          assignee_email: newTicket.assigneeEmail,
        }
      );

      const createdKey = resp.data.issue_key;
      const now = new Date().toISOString();

      const newIssue: Issue = {
        issue_key: createdKey,
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority,
        issue_category: newTicket.issue_category,
        createdAt: now,
        Assignee: newTicket.assigneeEmail || "Unassigned",
        projectKey: projectKey || "",
      };

      setIssues((prev) => [newIssue, ...prev]);

      // Reset form
      setNewTicket({
        title: "",
        description: "",
        priority: "Medium",
        issue_category: "Platform & Infrastructure Failures",
        assigneeEmail: "",
      });

      setIsDialogOpen(false);
    } catch (err: any) {
      setSubmitError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.message
          : "Failed to create ticket."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const groupedIssues: Record<Category, Issue[]> = {
    "Platform & Infrastructure Failures": [],
    "Automation & Communication Failures": [],
    "Configuration & Customization Errors": [],
    "Data & Integration Errors": [],
    "Access & Security Challenges": [],
  };

  issues.forEach((issue) => {
    const category =
      issue.issue_category || "Platform & Infrastructure Failures";
    if (!groupedIssues[category]) groupedIssues[category] = [];
    groupedIssues[category].push(issue);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#00172e] to-[#001030] text-white">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 pt-20 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-green-400">
                Active Project
              </span>
            </div>
            <h1 className="text-3xl font-bold mt-1 flex items-center">
              <span className="text-white/80">{platform}/</span>
              <span className="text-white">{projectKey}</span>
            </h1>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg shadow-blue-900/30 transition-all duration-300"
          >
            <Plus className="h-4 w-4" /> Raise a Ticket
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                <p className="text-blue-300 animate-pulse">Loading Tickets...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center p-10 bg-red-900/20 rounded-xl border border-red-800">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-red-300">{error}</p>
            </div>
          ) : (
            Object.entries(groupedIssues).map(
              ([category, categoryIssues]) =>
                categoryIssues.length > 0 && (
                  <div key={category} className="mb-12">
                    <div className="mb-6">
                      <h2 className="flex items-center text-2xl font-semibold mb-2 border-b-2 border-blue-600/70 pb-2 sticky top-0 z-10 py-2">
                        <span className="mr-3 text-2xl select-none bg-white/10 p-2 rounded-lg">
                          {categoryIcons[category as Category]}
                        </span>
                        <span className="text-white">{category}</span>
                        <span className="ml-3 text-sm font-normal text-white/80 bg-blue-900/50 px-3 py-1 rounded-full">
                          {categoryIssues.length}{" "}
                          {categoryIssues.length === 1 ? "issue" : "issues"}
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryIssues.map((issue) => (
                        <Link
                          to={`/ticket/${issue.issue_key}`}
                          state={{ issue }}
                          key={issue.issue_key}
                          className="group"
                        >
                          <Card
                            className={cn(
                              "h-full flex flex-col justify-between overflow-hidden",
                              "border-l-4 backdrop-blur-sm transition-all duration-300",
                              "hover:shadow-xl hover:shadow-black/20 hover:translate-y-[-2px]",
                              issue.priority === "High"
                                ? "border-red-500 bg-red-500/10 hover:bg-red-500/15"
                                : issue.priority === "Medium"
                                ? "border-amber-500 bg-amber-500/10 hover:bg-amber-500/15"
                                : "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
                            )}
                          >
                            <CardHeader className="p-5 pb-0 bg-black/20">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded shadow-inner">
                                      {issue.issue_key}
                                    </div>
                                    <Badge
                                      className={cn(
                                        "flex items-center gap-1 px-3 py-1 text-xs font-medium shadow-md",
                                        priorityColors[issue.priority]
                                      )}
                                    >
                                      {priorityIcons[issue.priority]}
                                      {issue.priority}
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-lg font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors mt-2">
                                    {issue.title}
                                  </CardTitle>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="flex flex-col justify-between flex-grow p-5 bg-gradient-to-b from-transparent to-black/20">
                              <div className="mb-4">
                                <p className="text-sm text-white/80 line-clamp-3 mb-3 mt-2">
                                  {issue.description}
                                </p>
                              </div>

                              <div className="space-y-3 mt-auto pt-3 border-t border-white/20 bg-black/10 -mx-5 px-5 py-2 rounded-b-lg">
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <User className="w-3.5 h-3.5" />
                                  <span className="truncate">
                                    {issue.Assignee}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatDate(issue.createdAt)}</span>
                                </div>

                                {issue.issue_stats && (
                                  <div className="flex items-center gap-2 text-xs font-medium text-blue-300 bg-blue-900/50 px-3 py-2 rounded-md shadow-inner animate-pulse">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>
                                      {issue.issue_stats}{" "}
                                      {Number(issue.issue_stats) === 1
                                        ? "user"
                                        : "users"}{" "}
                                      faced the same issue!
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
            )
          )}

          {!loading &&
            !error &&
            Object.values(groupedIssues).every(
              (issues) => issues.length === 0
            ) && (
              <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-gradient-to-b from-blue-900/10 to-blue-900/30 rounded-xl border border-blue-800/30">
                <div className="w-20 h-20 bg-blue-900/40 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20 animate-pulse">
                  <AlertCircle className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-medium text-white mb-3">
                  No issues found
                </h3>
                <p className="text-white/70 max-w-md mb-6">
                  There are currently no open issues for this project. Click
                  "Raise a Ticket" to create a new issue.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-900/30"
                >
                  <Plus className="mr-2 h-4 w-4" /> Raise a Ticket
                </Button>
              </div>
            )}
        </ScrollArea>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#001a33] border-white/10 text-white sm:max-w-[550px] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Raise a New Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-white/80">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={newTicket.title}
                onChange={handleInputChange}
                placeholder="Enter ticket title"
                className="bg-white/5 border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigneeEmail" className="text-white/80">
                Assignee Email
              </Label>
              <Input
                id="assigneeEmail"
                name="assigneeEmail"
                type="email"
                value={newTicket.assigneeEmail}
                onChange={handleInputChange}
                placeholder="Enter assignee's email"
                className="bg-white/5 border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Category Select */}
              <div className="flex flex-col gap-2 min-w-0">
                <Label htmlFor="category" className="text-white/80">
                  Category
                </Label>
                <Select
                  value={newTicket.issue_category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="bg-white/5 border border-white/10 text-white min-w-0">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001a33] border-white/10 text-white">
                    {Object.keys(groupedIssues).map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-white focus:bg-blue-900/50 focus:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span>{categoryIcons[cat as Category]}</span>
                          <span>{cat}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Select */}
              <div className="flex flex-col gap-2 min-w-0">
                <Label htmlFor="priority" className="text-white/80">
                  Priority
                </Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="bg-white/5 border border-white/10 text-white min-w-0">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001a33] border-white/10 text-white">
                    <SelectItem
                      value="High"
                      className="text-white focus:bg-red-900/50 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>High</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="Medium"
                      className="text-white focus:bg-amber-900/50 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Medium</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="Low"
                      className="text-white focus:bg-emerald-900/50 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Low</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white/80">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={newTicket.description}
                onChange={handleInputChange}
                placeholder="Enter ticket description"
                className="bg-white/5 border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px]"
              />
            </div>

            {submitError && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-md p-3 text-red-300 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p>{submitError}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-white/10 text-black hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
