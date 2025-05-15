"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Issue {
  issue_key: number;
  title: string;
  priority: Priority;
  description: string;
  createdAt: string;
  assignedBy: string;
  projectKey: string;
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

  // New state for the ticket modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    priority: Priority;
  }>({
    title: "",
    description: "",
    priority: "Medium",
  });

  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const endpoint =
          platform === "jira" ? "/tickets/open/jira" : "/tickets/open/clickup";
        console.log(`Fetching from: ${endpoint}`);
        const response = await axios.post(`${API_BASE_URL_PROD}${endpoint}`, {
          project_key: projectKey,
        });
        console.log(response.data);

        const fetchedIssues =
          response.data.open_tickets || response.data.open_tasks;
        const issuesWithProjectKey = fetchedIssues.map((issue: Issue) => ({
          ...issue,
          projectKey: projectKey,
        }));

        setIssues(issuesWithProjectKey);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.message || "Failed to fetch tickets.");
        } else {
          setError("Failed to fetch tickets.");
        }
      } finally {
        console.log("Loading finished");
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

  const handlePriorityChange = (value: string) => {
    setNewTicket((prev) => ({ ...prev, priority: value as Priority }));
  };

  const handleSubmit = () => {
    // Validate form
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    // Create new ticket (frontend only)
    const newIssue: Issue = {
      issue_key: Date.now(), // Generate a temporary unique ID
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      createdAt: new Date().toISOString(),
      assignedBy: "Current User", // You might want to get this from user context
      projectKey: projectKey || "",
    };

    // Add to the list
    setIssues((prev) => [newIssue, ...prev]);

    // Reset form and close dialog
    setNewTicket({
      title: "",
      description: "",
      priority: "Medium",
    });
    setIsDialogOpen(false);
  };

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
                  <Card
                    className={`border-l-4 ${
                      issue.priority === "High"
                        ? "border-red-500 bg-red-500/10"
                        : issue.priority === "Medium"
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-green-500 bg-green-500/10"
                    } backdrop-filter backdrop-blur-lg hover:bg-opacity-20 transition-all duration-300`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold text-white">
                          {issue.title}
                        </CardTitle>
                        <Badge
                          className={`${
                            priorityColors[issue.priority]
                          } text-white`}
                        >
                          {issue.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-300 mb-4">
                        {issue.description}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>
                          Created:{" "}
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
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

      {/* Ticket Creation Dialog */}
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
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTicket.priority}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="bg-white bg-opacity-10 border-white border-opacity-20">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#001f3f] border-white border-opacity-20">
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
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
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
