"use client";

import LeadsCrmDashboard, { type Lead } from "@/components/LeadsCrmDashboard";

interface Website {
  id: string;
  name: string;
}

interface Props {
  initialLeads: Lead[];
  websites: Website[];
}

export default function LeadsDashboard({ initialLeads, websites }: Props) {
  return (
    <LeadsCrmDashboard
      initialLeads={initialLeads}
      websites={websites}
      isWebsiteSpecific={false}
    />
  );
}
