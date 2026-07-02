export type Role = "owner" | "ops" | "pm" | "employee" | "newcomer" | "contractor" | "client";

export type Status = "active" | "review" | "risk" | "done" | "archived";

export type User = {
  id: string;
  name: string;
  role: Role;
  companyId?: string;
  title: string;
  avatar: string;
};

export type Company = {
  id: string;
  name: string;
  contact: string;
  health: "good" | "watch" | "risk";
};

export type Project = {
  id: string;
  companyId: string;
  name: string;
  status: Status;
  ownerId: string;
  deadline: string;
  progress: number;
  risk: string;
  nextStep: string;
  budgetVisibleToClient: boolean;
};

export type Task = {
  id: string;
  projectId?: string;
  title: string;
  assigneeId: string;
  status: Status;
  priority: "low" | "normal" | "high";
  due: string;
  internalOnly: boolean;
};

export type DocumentItem = {
  id: string;
  projectId?: string;
  title: string;
  type: "brief" | "contract" | "report" | "creative" | "note";
  status: "draft" | "approval" | "approved" | "archived";
  clientVisible: boolean;
  updatedAt: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  category: "process" | "culture" | "client" | "onboarding";
  body: string;
  archived: boolean;
};

export type CalendarEvent = {
  id: string;
  projectId?: string;
  title: string;
  date: string;
  time: string;
  visibility: "internal" | "client" | "all";
};

export type Discussion = {
  id: string;
  projectId?: string;
  title: string;
  lastMessage: string;
  visibility: "internal" | "client";
};

export type ChangeLog = {
  id: string;
  entity: string;
  action: string;
  actor: string;
  at: string;
};

export type SiteModule = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

export type SitePage = {
  id: string;
  title: string;
  slug: string;
  audience: "internal" | "client" | "all";
  headline: string;
  body: string;
  enabled: boolean;
};

export type SiteSettings = {
  brandName: string;
  logoLetter: string;
  tagline: string;
  heroTitle: string;
  heroText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  modules: SiteModule[];
  pages: SitePage[];
};

export type SpaceData = {
  site: SiteSettings;
  users: User[];
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  documents: DocumentItem[];
  knowledge: KnowledgeArticle[];
  events: CalendarEvent[];
  discussions: Discussion[];
  changes: ChangeLog[];
};
