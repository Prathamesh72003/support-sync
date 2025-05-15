"use client";

import type React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
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

        const fetchedIssues = response.data.open_tickets || response.data.open_tasks;

        const issuesWithProjectKey: Issue[] = fetchedIssues.map((issue: any) => ({
          issue_key: issue.issue_key,
          title: issue.title,
          priority: issue.priority,
          description: issue.description,
          createdAt: issue.DateTime || new Date().toISOString(),
          Assignee: issue.Assignee || "Unassigned",
          projectKey: projectKey || "",
          issue_category: issue.issue_category || "Platform & Infrastructure Failures",
          issue_stats: issue.issue_stats ?? "-",
        }));

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
      const resp = await axios.post(`${API_BASE_URL_PROD}/tickets/create/jira`, {
        project_key: projectKey,
        summary: newTicket.title,
        description: newTicket.description,
        level: newTicket.priority,
        category_value: newTicket.issue_category,
        assignee_email: newTicket.assigneeEmail,
      });

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
    const category = issue.issue_category || "Platform & Infrastructure Failures";
    if (!groupedIssues[category]) groupedIssues[category] = [];
    groupedIssues[category].push(issue);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001f3f] via-[#00172e] to-[#001030] text-white">
      <NavBar />

      <div className="max-w-7xl mx-auto pt-16">
        <div className="flex justify-between items-center mb-10 mt-10">
          <h1 className="text-3xl font-bold">{`${platform}/${projectKey}`}</h1>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Raise a Ticket
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)] pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-white" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            Object.entries(groupedIssues).map(
              ([category, categoryIssues]) =>
                categoryIssues.length > 0 && (
                  <div key={category} className="mb-10">
                    <h2 className="flex items-center text-2xl font-semibold mb-4 border-b-2 border-gray-600 pb-1">
                      <span className="mr-2 text-xl select-none">
                        {category === "Platform & Infrastructure Failures" && "🖥️"}
                        {category === "Automation & Communication Failures" && "🤖"}
                        {category === "Configuration & Customization Errors" && "⚙️"}
                        {category === "Data & Integration Errors" && "🔗"}
                        {category === "Access & Security Challenges" && "🔒"}
                      </span>
                      {category}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {categoryIssues.map((issue) => (
                        <Link
                          to={`/ticket/${issue.issue_key}`}
                          state={{ issue }}
                          key={issue.issue_key}
                        >
                          <Card
                            className={`h-[340px] flex flex-col justify-between border-l-4 ${
                              issue.priority === "High"
                                ? "border-red-500 bg-red-500/10"
                                : issue.priority === "Medium"
                                ? "border-yellow-500 bg-yellow-500/10"
                                : "border-green-500 bg-green-500/10"
                            } backdrop-filter backdrop-blur-lg hover:bg-opacity-20 transition-all duration-300`}
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-xl font-semibold text-white line-clamp-2">
                                  {issue.title}
                                </CardTitle>
                                <Badge
                                  className={`${priorityColors[issue.priority]} text-white`}
                                >
                                  {issue.priority}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex flex-col justify-between flex-grow">
                              <div>
                                <p className="text-sm text-gray-300 mb-2 line-clamp-3">
                                  {issue.description}
                                </p>
                                <p className="text-xs text-gray-400 mb-2 italic">
                                  Category: {issue.issue_category}
                                </p>
                              </div>
                              <div className="mt-auto">
                                <div className="text-xs text-gray-400 italic mb-2">
                                  Assignee: {issue.Assignee}
                                </div>
                                <div className="text-xs text-gray-400 italic mb-2">
                                  Created: {new Date(issue.createdAt).toLocaleString()}
                                </div>
                                <div className="text-sm font-semibold text-blue-300 bg-blue-900/30 px-3 py-1 rounded-lg text-center">
                                  No. of users faced this issue:{" "}
                                  {issue.issue_stats ?? "-"}
                                </div>
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
        </ScrollArea>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#001f3f] border-white border-opacity-20 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Raise a New Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={newTicket.title}
                onChange={handleInputChange}
                placeholder="Enter ticket title"
                className="bg-white bg-opacity-10 border-white border-opacity-20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assigneeEmail">Assignee Email</Label>
              <Input
                id="assigneeEmail"
                name="assigneeEmail"
                type="email"
                value={newTicket.assigneeEmail}
                onChange={handleInputChange}
                placeholder="Enter assignee's email"
                className="bg-white bg-opacity-10 border-white border-opacity-20"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTicket.issue_category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="bg-white bg-opacity-10 border-white border-opacity-20">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#001f3f] border-white border-opacity-20 text-white">
                  {Object.keys(groupedIssues).map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-white">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTicket.priority}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="bg-white bg-opacity-10 border-white border-opacity-20">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#001f3f] border-white border-opacity-20 text-white">
                  <SelectItem value="High" className="text-white">High</SelectItem>
                  <SelectItem value="Medium" className="text-white">Medium</SelectItem>
                  <SelectItem value="Low" className="text-white">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={newTicket.description}
                onChange={handleInputChange}
                placeholder="Enter ticket description"
                className="bg-white bg-opacity-10 border-white border-opacity-20 min-h-[100px]"
              />
            </div>

            {submitError && (
              <p className="text-red-500 text-sm text-center">{submitError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-white border-opacity-20 text-black hover:bg-white hover:bg-opacity-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
