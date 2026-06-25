import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Key, Code, BookOpen, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings & API Integration — Lead Hub",
  description: "User profile settings and API documentation details.",
};

export default async function SettingsPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  const codeSnippet = `// Example integration in Javascript / Typescript
const submitLead = async (formData) => {
  try {
    const response = await fetch("https://${process.env.NEXT_PUBLIC_APP_URL || "leads-hub.com"}/api/leads/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secretKey: "YOUR_WEBSITE_SECRET_KEY", // Retrieve from Website API settings
        FormDataJson: {
          name: formData.name,       // Automatically recognized
          email: formData.email,     // Automatically recognized
          phone: formData.phone,     // Automatically recognized
          message: formData.message, // Automatically recognized
          company: formData.company, // Saved inside metadata JSON
          budget: formData.budget,   // Saved inside metadata JSON
        }
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Lead captured successfully!", result.leadId);
    } else {
      console.error("Submission failed:", result.error);
    }
  } catch (err) {
    console.error("Network error during submission:", err);
  }
};`;

  const curlSnippet = `curl -X POST https://${process.env.NEXT_PUBLIC_APP_URL || "leads-hub.com"}/api/leads/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "secretKey": "YOUR_WEBSITE_SECRET_KEY",
    "FormDataJson": {
      "name": "Alex Mercer",
      "email": "alex@example.com",
      "phone": "+14155552671",
      "message": "We need a quick implementation plan details.",
      "referred_by": "search_engine"
    }
  }'`;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & API Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account profile and configure integration codes on your forms.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">User Profile</CardTitle>
          <CardDescription>Your personal account details synced from Clerk.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4 border-t border-border/40 pt-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{user.name || "N/A"}</h3>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono select-all">
                User ID: {user.id}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono select-all">
                Clerk ID: {user.clerkUserId}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Header */}
      <div className="flex items-center gap-2 mt-2">
        <BookOpen size={20} className="text-primary" />
        <h2 className="text-lg font-bold tracking-tight">API Integration Reference</h2>
      </div>

      {/* Documentation Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key size={16} className="text-muted-foreground" />
            Lead Capture Endpoint
          </CardTitle>
          <CardDescription>
            Send HTTP POST payloads from your external landing pages or client contact forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 border-t border-border/40 pt-4">
          {/* Method and URL */}
          <div className="flex items-center gap-2 bg-muted/40 p-3 rounded-md border border-border/30">
            <span className="bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded text-xs">
              POST
            </span>
            <span className="font-mono text-sm break-all font-semibold text-foreground select-all">
              https://{process.env.NEXT_PUBLIC_APP_URL || "leads-hub.com"}/api/leads/submit
            </span>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <AlertCircle size={17} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Payload Flexibility</p>
              <p>
                Our server dynamically parses inputs case-insensitively for key names like <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, and <strong>message</strong>. 
                Any additional parameters submitted inside <strong>FormDataJson</strong> are captured and stored in the <strong>metadata</strong> JSON field.
              </p>
            </div>
          </div>

          {/* Javascript Snippet */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Code size={14} />
              Javascript Integration Snippet
            </span>
            <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto text-foreground border border-border/50 max-h-[350px]">
              {codeSnippet}
            </pre>
          </div>

          {/* cURL Snippet */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-xs font-semibold text-foreground">
              cURL Request Example
            </span>
            <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto text-foreground border border-border/50">
              {curlSnippet}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
