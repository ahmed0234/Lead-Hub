"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Download,
  Inbox,
  Globe,
  Calendar,
  Database,
  Mail,
  Phone,
  Clock,
  Trash2,
  Edit2,
  Eye,
  MoreHorizontal,
  Plus,
  X,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// Define the interface for a Lead
export interface Lead {
  id: string;
  websiteId: string;
  websiteName?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
  metadata: any;
  submittedAt: string | Date;
}

interface Website {
  id: string;
  name: string;
}

interface Props {
  initialLeads: Lead[];
  websites?: Website[];
  isWebsiteSpecific?: boolean;
}

// Color coding for Lead Status
export const statusColors: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 font-medium",
  Contacted: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium",
  Qualified: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 font-medium",
  Converted: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-medium",
};

export const statusValues = ["New", "Contacted", "Qualified", "Converted"];

// Helper to extract a preview message dynamically from the metadata
export function getLeadPreviewText(lead: Lead): string {
  if (lead.message && lead.message.trim()) return lead.message;
  
  const metadata = lead.metadata || {};
  const inquiryKeys = [
    "message", "msg", "inquiry", "projectDetails", "project_details",
    "details", "description", "comment", "comments", "notes", "note", "feedback", "body"
  ];
  
  for (const key of inquiryKeys) {
    const match = Object.keys(metadata).find(k => k.toLowerCase() === key.toLowerCase());
    if (match && metadata[match]) {
      return String(metadata[match]);
    }
  }
  
  const excluded = ["name", "email", "phone", "status", "source", "id", "websiteid", "submittedat"];
  let longestVal = "";
  for (const [k, v] of Object.entries(metadata)) {
    if (!excluded.includes(k.toLowerCase()) && typeof v === "string") {
      if (v.length > longestVal.length) {
        longestVal = v;
      }
    }
  }
  
  return longestVal || "No message preview attached.";
}

// Helper to extract clean source from referrer
export function getCleanSource(referrer: string | null): string {
  if (!referrer || referrer === "Unknown" || referrer.trim() === "") {
    return "Web Form";
  }
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (host.includes("google.")) return "Google";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("t.co") || host.includes("twitter.com") || host.includes("x.com")) return "Twitter/X";
    if (host.includes("github.com")) return "GitHub";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    return url.hostname.replace("www.", "");
  } catch {
    const lower = referrer.toLowerCase();
    if (lower.includes("google")) return "Google";
    if (lower.includes("linkedin")) return "LinkedIn";
    if (lower.includes("github")) return "GitHub";
    if (lower.includes("twitter") || lower.includes("t.co")) return "Twitter/X";
    return referrer;
  }
}

export default function LeadsCrmDashboard({
  initialLeads,
  websites = [],
  isWebsiteSpecific = false,
}: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [sortField, setSortField] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal Dialog States
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic form fields state for metadata editing
  const [editFormMetadata, setEditFormMetadata] = useState<Record<string, string>>({});
  const [editFormStatus, setEditFormStatus] = useState("New");
  const [editFormSource, setEditFormSource] = useState("Web Form");
  
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // Process Leads with Defaults
  const processedLeads = useMemo(() => {
    return leads.map((lead) => {
      const status = lead.metadata?.status || "New";
      const source = lead.metadata?.source || getCleanSource(lead.referrer);
      return {
        ...lead,
        resolvedStatus: status,
        resolvedSource: source,
      };
    });
  }, [leads]);

  // Unique sources for filtering dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    processedLeads.forEach((l) => sources.add(l.resolvedSource));
    return Array.from(sources).sort();
  }, [processedLeads]);

  // Filter & Sort
  const filteredLeads = useMemo(() => {
    return processedLeads
      .filter((lead) => {
        const matchesSearch =
          !searchTerm.trim() ||
          (lead.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.phone?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.message?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (JSON.stringify(lead.metadata).toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || lead.resolvedStatus === statusFilter;
        const matchesSource = sourceFilter === "all" || lead.resolvedSource === sourceFilter;
        const matchesWebsite =
          isWebsiteSpecific || websiteFilter === "all" || lead.websiteId === websiteFilter;

        return matchesSearch && matchesStatus && matchesSource && matchesWebsite;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === "date") {
          const dateA = new Date(a.submittedAt).getTime();
          const dateB = new Date(b.submittedAt).getTime();
          comparison = dateA - dateB;
        } else if (sortField === "name") {
          const nameA = a.name || "";
          const nameB = b.name || "";
          comparison = nameA.localeCompare(nameB);
        } else if (sortField === "status") {
          comparison = a.resolvedStatus.localeCompare(b.resolvedStatus);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [processedLeads, searchTerm, statusFilter, sourceFilter, websiteFilter, sortField, sortOrder, isWebsiteSpecific]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage]);

  // CRM Statistics
  const stats = useMemo(() => {
    const total = processedLeads.length;
    const isNew = processedLeads.filter((l) => l.resolvedStatus === "New").length;
    const isQualified = processedLeads.filter((l) => l.resolvedStatus === "Qualified").length;
    const isConverted = processedLeads.filter((l) => l.resolvedStatus === "Converted").length;
    const convRate = total > 0 ? ((isConverted / total) * 100).toFixed(1) : "0";

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = processedLeads.filter((l) => new Date(l.submittedAt) >= oneWeekAgo).length;

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const thisMonth = processedLeads.filter((l) => new Date(l.submittedAt) >= oneMonthAgo).length;

    return { total, isNew, isQualified, isConverted, convRate, thisWeek, thisMonth };
  }, [processedLeads]);

  // Recharts: Line Chart (Activity over last 7 days)
  const lineChartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = processedLeads.filter((l) => {
        const sDate = new Date(l.submittedAt);
        return (
          sDate.getDate() === d.getDate() &&
          sDate.getMonth() === d.getMonth() &&
          sDate.getFullYear() === d.getFullYear()
        );
      }).length;
      data.push({ date: label, count });
    }
    return data;
  }, [processedLeads]);

  // Recharts: Bar Chart (Sources breakdown)
  const barChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    processedLeads.forEach((l) => {
      counts[l.resolvedSource] = (counts[l.resolvedSource] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [processedLeads]);

  // Recharts: Donut Chart (Status breakdown)
  const donutChartData = useMemo(() => {
    const counts = { New: 0, Contacted: 0, Qualified: 0, Converted: 0 };
    processedLeads.forEach((l) => {
      const st = l.resolvedStatus as keyof typeof counts;
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.New++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [processedLeads]);

  const COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#10b981"];

  // Open Edit Dialog & Hydrate values
  function handleOpenEdit(lead: Lead) {
    setEditLead(lead);
    setEditFormStatus(lead.metadata?.status || "New");
    setEditFormSource(lead.metadata?.source || getCleanSource(lead.referrer));
    
    // Copy the entire metadata to editFormMetadata, EXCLUDING status and source (which are handled by select dropdowns/special controls)
    const metadata = { ...(lead.metadata || {}) };
    delete metadata.status;
    delete metadata.source;
    
    // Convert all metadata values to string representations for easy input bindings
    const flatMetadata: Record<string, string> = {};
    Object.entries(metadata).forEach(([k, v]) => {
      flatMetadata[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    });
    setEditFormMetadata(flatMetadata);
    setNewKey("");
    setNewValue("");
  }

  // Handle Metadata Add Field
  function handleAddCustomField() {
    if (!newKey.trim()) {
      toast.error("Custom field key cannot be empty");
      return;
    }
    const sanitizedKey = newKey.trim();
    if (editFormMetadata[sanitizedKey] !== undefined) {
      toast.error("This field already exists");
      return;
    }
    setEditFormMetadata((prev) => ({
      ...prev,
      [sanitizedKey]: newValue,
    }));
    setNewKey("");
    setNewValue("");
  }

  // Handle Metadata Remove Field
  function handleRemoveCustomField(keyToRemove: string) {
    setEditFormMetadata((prev) => {
      const copy = { ...prev };
      delete copy[keyToRemove];
      return copy;
    });
  }

  // Save Lead Updates
  async function handleSaveEdit() {
    if (!editLead) return;
    setIsSaving(true);

    // Reconstruct metadata
    const metadataObject: Record<string, any> = {};
    Object.entries(editFormMetadata).forEach(([k, v]) => {
      try {
        if ((v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"))) {
          metadataObject[k] = JSON.parse(v);
        } else {
          metadataObject[k] = v;
        }
      } catch {
        metadataObject[k] = v;
      }
    });
    metadataObject.status = editFormStatus;
    metadataObject.source = editFormSource;

    try {
      const res = await fetch(`/api/leads/${editLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editFormStatus,
          source: editFormSource,
          metadata: metadataObject,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to save changes");
        return;
      }

      const { lead: updatedLead } = await res.json();
      
      // Update local leads list
      setLeads((prev) =>
        prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
      );
      toast.success("Lead updated successfully");
      setEditLead(null);
      router.refresh();
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Confirm Lead Deletion
  async function handleDeleteConfirm() {
    if (!deleteLeadId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/leads/${deleteLeadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete lead");
        return;
      }

      setLeads((prev) => prev.filter((l) => l.id !== deleteLeadId));
      toast.success("Lead deleted successfully");
      setDeleteLeadId(null);
      if (currentPage > 1 && paginatedLeads.length === 1) {
        setCurrentPage((prev) => prev - 1);
      }
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle Export CSV
  function handleExportCSV() {
    if (filteredLeads.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const headers = [
      "Website",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Source",
      "Message",
      "IP Address",
      "Referrer",
      "Submitted At",
    ];

    const rows = filteredLeads.map((l) => [
      l.websiteName || "",
      l.name || "",
      l.email || "",
      l.phone || "",
      l.resolvedStatus,
      l.resolvedSource,
      l.message || "",
      l.ip || "",
      l.referrer || "",
      new Date(l.submittedAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `leads_crm_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredLeads.length} leads successfully`);
  }

  // Reset all filters
  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setSourceFilter("all");
    setWebsiteFilter("all");
    setCurrentPage(1);
    toast.success("Filters cleared");
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-xs relative overflow-hidden bg-card group hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total CRM Leads
            </CardTitle>
            <Database size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.total}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-muted/60 font-mono">
                {stats.thisMonth}
              </Badge>
              <span>captured in last 30 days</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs bg-card group hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Conversion Rate
            </CardTitle>
            <TrendingUp size={15} className="text-emerald-500/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1">
              {stats.convRate}%
              <span className="text-xs font-medium text-emerald-500 font-mono">
                {stats.isConverted} conv
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Percentage of converted status leads
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs bg-card group hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Qualified Pipeline
            </CardTitle>
            <Award size={15} className="text-amber-500/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.isQualified}</div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Awaiting agent sales review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs bg-card group hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              New Leads Activity
            </CardTitle>
            <Sparkles size={15} className="text-blue-500/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight flex items-baseline gap-1">
              {stats.isNew}
              <span className="text-xs font-medium text-blue-500 font-mono">
                {stats.thisWeek} this wk
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Unassigned and recently captured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. VISUAL CHARTS PANEL */}
      {leads.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Line Chart for Growth */}
          <Card className="lg:col-span-2 border border-border/60 bg-card/65 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock size={15} className="text-muted-foreground" />
                Lead Volume Trend (Past 7 Days)
              </CardTitle>
              <CardDescription className="text-xs">
                Timeline of inbound leads captured day-by-day
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 pt-4">
              <ChartContainer
                config={{
                  count: { label: "Leads", color: "var(--primary)" },
                }}
                className="w-full h-full"
              >
                <AreaChart
                  data={lineChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    className="text-[10px]"
                  />
                  <YAxis tickLine={false} axisLine={false} className="text-[10px]" />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Donut Chart for Status */}
          <Card className="border border-border/60 bg-card/65 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers size={15} className="text-muted-foreground" />
                Status Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                CRM status mapping profile
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutChartData
                        .filter((d) => d.value > 0)
                        .map((entry, index) => {
                          const statusIndex = statusValues.indexOf(entry.name);
                          const color = COLORS[statusIndex !== -1 ? statusIndex : 0];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Total Leads Overlay inside the donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {stats.total}
                  </span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0 justify-center">
                {donutChartData.map((d, index) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="font-medium text-foreground min-w-16">{d.name}</span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground ml-auto bg-muted/65 px-1.5 py-0.5 rounded">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart 3: Bar Chart for Sources */}
          <Card className="lg:col-span-3 border border-border/60 bg-card/65 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe size={15} className="text-muted-foreground" />
                Lead Influx Channels (Top Sources)
              </CardTitle>
              <CardDescription className="text-xs">
                Channels driving submissions based on referrer metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="h-52 pt-4">
              {barChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No source data available
                </div>
              ) : (
                <ChartContainer
                  config={{
                    count: { label: "Leads", color: "var(--primary)" },
                  }}
                  className="w-full h-full"
                >
                  <BarChart
                    data={barChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      className="text-[10px] font-medium"
                    />
                    <YAxis tickLine={false} axisLine={false} className="text-[10px]" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. CONTROLS / FILTERS BAR */}
      <div className="flex flex-col gap-4 border border-border/60 bg-card p-4 rounded-lg shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search leads by name, email, details..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-muted/20 border-border/80 text-sm focus-visible:ring-1"
            />
          </div>

          {/* Filtering Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Website Filter (Only if global) */}
            {!isWebsiteSpecific && websites.length > 0 && (
              <Select
                value={websiteFilter}
                onValueChange={(val) => {
                  setWebsiteFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] bg-muted/20 text-xs border-border/80 h-9 font-medium">
                  <SelectValue placeholder="All Websites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Websites</SelectItem>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] bg-muted/20 text-xs border-border/80 h-9 font-medium">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusValues.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select
              value={sourceFilter}
              onValueChange={(val) => {
                setSourceFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] bg-muted/20 text-xs border-border/80 h-9 font-medium">
                <SelectValue placeholder="Source: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((src) => (
                  <SelectItem key={src} value={src}>
                    {src}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order Selector */}
            <Select
              value={`${sortField}-${sortOrder}`}
              onValueChange={(val) => {
                const [field, order] = val.split("-") as [any, any];
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="w-[150px] bg-muted/20 text-xs border-border/80 h-9 font-medium">
                <SelectValue placeholder="Sort: Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="status-asc">Status (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* Export and Reset Buttons */}
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Download size={14} />
              Export
            </Button>

            {(searchTerm || statusFilter !== "all" || sourceFilter !== "all" || websiteFilter !== "all") && (
              <Button
                onClick={handleClearFilters}
                variant="ghost"
                size="sm"
                className="h-9 hover:bg-muted text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4. LEADS LISTINGS */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center bg-card shadow-2xs">
          <Inbox size={42} className="text-muted-foreground/60 mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-foreground">
            No matching leads found
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Try adjusting your search query, sorting parameters, or filter selections.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Data Table for Desktop */}
          <div className="hidden md:block rounded-lg border border-border/60 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[45px] text-xs font-bold text-center pl-4">#</TableHead>
                  {!isWebsiteSpecific && <TableHead className="w-[140px] text-xs font-bold">Website</TableHead>}
                  <TableHead className="text-xs font-bold w-[180px]">Contact Info</TableHead>
                  <TableHead className="text-xs font-bold">Submission Preview</TableHead>
                  <TableHead className="w-[110px] text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-center">Source</TableHead>
                  <TableHead className="w-[130px] text-xs font-bold">Submitted Date</TableHead>
                  <TableHead className="w-[80px] text-xs font-bold text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead, idx) => {
                  const itemNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <TableRow
                      key={lead.id}
                      className="hover:bg-muted/20 cursor-pointer transition-colors group"
                      onClick={() => setViewLead(lead)}
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono font-medium text-center pl-4">
                        {itemNumber}.
                      </TableCell>
                      {!isWebsiteSpecific && (
                        <TableCell className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                          {lead.websiteName || "System Site"}
                        </TableCell>
                      )}
                      <TableCell className="max-w-[180px] truncate">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {lead.name || "Unnamed Contact"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate font-normal">
                          {lead.email || "No Email"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground font-normal">
                        {getLeadPreviewText(lead)}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Badge className={statusColors[lead.resolvedStatus] || statusColors.New}>
                          {lead.resolvedStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[11px] font-medium bg-muted/20 text-muted-foreground border-border/70">
                          {lead.resolvedSource}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(lead.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <MoreHorizontal size={15} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[140px] bg-card border-border/80">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground">Lead Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewLead(lead)} className="text-xs gap-2">
                              <Eye size={13} /> View profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(lead)} className="text-xs gap-2">
                              <Edit2 size={13} /> Edit details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/60" />
                            <DropdownMenuItem
                              onClick={() => setDeleteLeadId(lead.id)}
                              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                            >
                              <Trash2 size={13} /> Delete lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Cards Grid for Mobile view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {paginatedLeads.map((lead, idx) => {
              const itemNumber = (currentPage - 1) * itemsPerPage + idx + 1;
              return (
                <Card
                  key={lead.id}
                  className="border border-border/60 bg-card p-4 hover:border-border transition-colors cursor-pointer"
                  onClick={() => setViewLead(lead)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="truncate pr-2">
                      <p className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground font-mono font-medium bg-muted px-1 rounded">
                          {itemNumber}.
                        </span>
                        {lead.name || "Unnamed Contact"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email || "No Email"}</p>
                    </div>
                    <Badge className={statusColors[lead.resolvedStatus] || statusColors.New}>
                      {lead.resolvedStatus}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded mb-3 border border-border/20">
                    {getLeadPreviewText(lead)}
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/40 pt-3">
                    <span>Source: <strong className="text-foreground">{lead.resolvedSource}</strong></span>
                    <span>{new Date(lead.submittedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border/10" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted" onClick={() => setViewLead(lead)}>
                      <Eye size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted" onClick={() => handleOpenEdit(lead)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={() => setDeleteLeadId(lead.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground font-semibold">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong className="text-foreground font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredLeads.length)}
                </strong>{" "}
                of <strong className="text-foreground font-semibold">{filteredLeads.length}</strong> leads
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
                </Button>
                
                <span className="text-xs text-muted-foreground min-w-16 text-center">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          DIALOG MODALS (VIEW, EDIT, DELETE)
          ============================================================== */}

      {/* VIEW LEAD DIALOG */}
      <Dialog open={!!viewLead} onOpenChange={(open) => !open && setViewLead(null)}>
        <DialogContent className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full bg-card border-border/80 overflow-y-auto max-h-[85vh] p-6 gap-6">
          {viewLead && (() => {
            const metadataFields = Object.entries(viewLead.metadata || {}).filter(
              ([key]) => !["status", "source"].includes(key)
            );
            const shortFields = metadataFields.filter(([k, v]) => String(v).length <= 50 && !["message", "projectdetails", "project_details", "description", "inquiry"].includes(k.toLowerCase()));
            const longFields = metadataFields.filter(([k, v]) => String(v).length > 50 || ["message", "projectdetails", "project_details", "description", "inquiry"].includes(k.toLowerCase()));

            return (
              <>
                <DialogHeader className="border-b border-border/60 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <DialogTitle className="text-xl font-bold text-foreground">
                        Lead Profile: {viewLead.name || "Unnamed Contact"}
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-1">
                        ID: <span className="font-mono text-muted-foreground select-all">{viewLead.id}</span>
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[viewLead.resolvedStatus] || statusColors.New}>
                        {viewLead.resolvedStatus}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-muted/20 text-muted-foreground border-border/70">
                        {viewLead.resolvedSource}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2 text-sm">
                  {/* Left Area (col-span-2) - Form Payload */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Short Fields Grid */}
                    {shortFields.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pb-1.5 border-b border-border/30">
                          Form Submission Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-4 border border-border/40 rounded-lg">
                          {shortFields.map(([k, v]) => (
                            <div key={k} className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{k}</span>
                              <span className="text-sm font-medium text-foreground select-all break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Long Fields List */}
                    {longFields.length > 0 && (
                      <div className="flex flex-col gap-4">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pb-1.5 border-b border-border/30">
                          Messages & Details
                        </h4>
                        <div className="flex flex-col gap-4">
                          {longFields.map(([k, v]) => (
                            <Card key={k} className="border border-border/60 bg-muted/5 shadow-none overflow-hidden">
                              <CardHeader className="py-2 px-4 bg-muted/20 border-b border-border/40">
                                <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{k}</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 text-xs leading-relaxed text-foreground select-all whitespace-pre-wrap">
                                {String(v)}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {metadataFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/15 border border-dashed rounded-lg border-border/50">
                        <Inbox size={28} className="text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium text-muted-foreground">No form data captured.</p>
                      </div>
                    )}
                  </div>

                  {/* Right Area (col-span-1) - System Context */}
                  <div className="md:col-span-1 flex flex-col gap-4">
                    <Card className="border border-border/60 bg-card shadow-none">
                      <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/10">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                          Inbound Context
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 flex flex-col gap-3.5 text-xs text-muted-foreground leading-normal">
                        {!isWebsiteSpecific && (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">Website</span>
                            <span className="text-[11px] font-mono text-foreground font-semibold truncate bg-muted/30 p-1.5 rounded border border-border/20">
                              {viewLead.websiteName || "System Site"}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">Submitted At</span>
                          <span className="font-mono text-foreground bg-muted/30 p-1.5 rounded border border-border/20">
                            {new Date(viewLead.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">IP Address</span>
                          <span className="font-mono text-foreground bg-muted/30 p-1.5 rounded border border-border/20 select-all">
                            {viewLead.ip || "Unknown"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">Referrer</span>
                          <span className="font-mono text-foreground bg-muted/30 p-1.5 rounded border border-border/20 select-all truncate" title={viewLead.referrer || "Direct"}>
                            {viewLead.referrer || "Direct / Organic"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">User Agent</span>
                          <span className="font-mono text-[10px] text-foreground bg-muted/30 p-1.5 rounded border border-border/20 line-clamp-3 select-all" title={viewLead.userAgent || "Unknown"}>
                            {viewLead.userAgent || "Unknown Browser"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <DialogFooter className="border-t border-border/40 pt-4 gap-2 mt-2">
                  <Button
                    onClick={() => {
                      setViewLead(null);
                      setDeleteLeadId(viewLead.id);
                    }}
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Delete lead
                  </Button>
                  <Button
                    onClick={() => {
                      setViewLead(null);
                      handleOpenEdit(viewLead);
                    }}
                    variant="outline"
                  >
                    Edit lead
                  </Button>
                  <Button onClick={() => setViewLead(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* EDIT LEAD DIALOG */}
      <Dialog open={!!editLead} onOpenChange={(open) => !open && setEditLead(null)}>
        <DialogContent className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full bg-card border-border/80 overflow-y-auto max-h-[85vh] p-6 gap-6">
          {editLead && (
            <>
              <DialogHeader className="border-b border-border/60 pb-4">
                <DialogTitle className="text-xl font-bold text-foreground">
                  Update Lead CRM Profile
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Fields in the form are dynamically loaded based on the metadata submitted by the client website.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2 text-sm">
                
                {/* Left Area (col-span-2) - Dynamic Form Fields */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pb-1.5 border-b border-border/30">
                    Form Submission Data
                  </h4>
                  
                  {Object.keys(editFormMetadata).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/15 border border-dashed rounded-lg border-border/50">
                      <p className="text-xs font-medium text-muted-foreground italic">No fields detected in submission payload.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 max-h-[45vh] overflow-y-auto pr-3">
                      {Object.entries(editFormMetadata).map(([key, value]) => {
                        const isLongText = value.length > 60 || ["message", "description", "projectdetails", "project_details", "comment", "comments", "inquiry"].includes(key.toLowerCase());
                        
                        return (
                          <div key={key} className="flex flex-col gap-1.5 pb-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor={`input-${key}`} className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {key}
                              </Label>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 hover:bg-destructive/15 text-destructive"
                                onClick={() => handleRemoveCustomField(key)}
                                title="Remove key from payload"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                            {isLongText ? (
                              <textarea
                                id={`input-${key}`}
                                value={value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditFormMetadata((prev) => ({ ...prev, [key]: val }));
                                }}
                                rows={3}
                                className="flex min-h-20 w-full rounded-md border border-border/85 bg-muted/20 px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring font-sans text-foreground"
                              />
                            ) : (
                              <Input
                                id={`input-${key}`}
                                value={value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditFormMetadata((prev) => ({ ...prev, [key]: val }));
                                }}
                                className="border-border/85 bg-muted/20 text-xs text-foreground font-sans h-9"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Area (col-span-1) - CRM Options & Tools */}
                <div className="md:col-span-1 flex flex-col gap-5">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pb-1.5 border-b border-border/30 mb-3">
                      CRM Lifecycle
                    </h4>
                    <div className="flex flex-col gap-4 bg-muted/10 p-4 border border-border/40 rounded-lg">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="editStatus" className="text-xs font-semibold text-muted-foreground uppercase">
                          Lead Status
                        </Label>
                        <select
                          id="editStatus"
                          value={editFormStatus}
                          onChange={(e) => setEditFormStatus(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-border/80 bg-card px-3 py-1 text-xs shadow-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-ring"
                        >
                          {statusValues.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="editSource" className="text-xs font-semibold text-muted-foreground uppercase">
                          Lead Channel / Source
                        </Label>
                        <Input
                          id="editSource"
                          value={editFormSource}
                          onChange={(e) => setEditFormSource(e.target.value)}
                          className="bg-card text-xs border-border/80 h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pb-1.5 border-b border-border/30 mb-3">
                      Add Custom Key
                    </h4>
                    <div className="flex flex-col gap-2.5 border border-border/60 p-3 rounded-lg bg-card shadow-none">
                      <Input
                        placeholder="Field Name (key)"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="h-8 text-xs border-border/80 bg-muted/10 font-mono"
                      />
                      <Input
                        placeholder="Value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="h-8 text-xs border-border/80 bg-muted/10 font-mono"
                      />
                      <Button
                        onClick={handleAddCustomField}
                        variant="secondary"
                        size="sm"
                        className="w-full gap-1.5 text-xs font-semibold h-8 hover:bg-muted border border-border/60"
                      >
                        <Plus size={13} />
                        Add Field
                      </Button>
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter className="border-t border-border/40 pt-4 gap-2 mt-2">
                <Button variant="outline" onClick={() => setEditLead(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete CRM Lead Submission?</DialogTitle>
            <DialogDescription className="text-xs pt-1.5">
              Warning: This action is permanent and cannot be undone. This submission will be removed from your database and dashboard charts forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDeleteLeadId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
