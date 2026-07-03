"use client";

import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { demoData } from "./demo-data";
import { getSupabaseClient, isSupabaseEnabled } from "./supabase";
import { CalendarEvent, ChangeLog, Company, Discussion, DocumentItem, KnowledgeArticle, Project, SiteSettings, SpaceData, Task, User } from "./types";

export type AuthState = {
  enabled: boolean;
  loading: boolean;
  supabaseUser: SupabaseUser | null;
  error?: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  companyId?: string;
  title?: string;
};

export function getClient() {
  return getSupabaseClient();
}

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseEnabled()) {
    return { enabled: false, loading: false, supabaseUser: null };
  }

  const supabase = requiredClient();
  const { data, error } = await supabase.auth.getSession();

  return {
    enabled: true,
    loading: false,
    supabaseUser: data.session?.user ?? null,
    error: error?.message
  };
}

export function onAuthChange(callback: () => void) {
  const supabase = getClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "INITIAL_SESSION") return;
    callback();
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string) {
  const supabase = requiredClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(input: SignUpInput) {
  const supabase = requiredClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: "client",
        company_id: input.companyId || null,
        title: input.title || ""
      }
    }
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const supabase = requiredClient();
  await supabase.auth.signOut();
}

export async function loadSpaceDataFromSupabase(): Promise<SpaceData> {
  const supabase = requiredClient();
  const [siteSettings, siteModules, sitePages, users, companies, projects, tasks, documents, knowledge, events, discussions, changes] = await Promise.all([
    selectAll(supabase, "site_settings"),
    selectAll(supabase, "site_modules"),
    selectAll(supabase, "site_pages"),
    selectAll(supabase, "profiles"),
    selectAll(supabase, "companies"),
    selectAll(supabase, "projects"),
    selectAll(supabase, "tasks"),
    selectAll(supabase, "documents"),
    selectAll(supabase, "knowledge_articles"),
    selectAll(supabase, "calendar_events"),
    selectAll(supabase, "discussions"),
    selectAll(supabase, "change_log")
  ]);

  return {
    site: mapSite(siteSettings[0], siteModules, sitePages),
    users: users.map(mapUser),
    companies: companies.map(mapCompany),
    projects: projects.map(mapProject),
    tasks: tasks.map(mapTask),
    documents: documents.map(mapDocument),
    knowledge: knowledge.map(mapArticle),
    events: events.map(mapEvent),
    discussions: discussions.map(mapDiscussion),
    changes: changes.map(mapChange)
  };
}

export async function saveProject(project: Project) {
  await upsert("projects", {
    id: project.id,
    company_id: project.companyId,
    name: project.name,
    status: project.status,
    owner_id: project.ownerId || null,
    deadline: project.deadline,
    progress: project.progress,
    risk: project.risk,
    next_step: project.nextStep,
    budget_visible_to_client: project.budgetVisibleToClient,
    updated_at: new Date().toISOString()
  });
}

export async function saveTask(task: Task) {
  await upsert("tasks", {
    id: task.id,
    project_id: task.projectId || null,
    title: task.title,
    assignee_id: task.assigneeId || null,
    status: task.status,
    priority: task.priority,
    due: task.due,
    internal_only: task.internalOnly
  });
}

export async function saveDocument(document: DocumentItem) {
  await upsert("documents", {
    id: document.id,
    project_id: document.projectId || null,
    title: document.title,
    type: document.type,
    status: document.status,
    client_visible: document.clientVisible,
    updated_at: new Date().toISOString()
  });
}

export async function saveArticle(article: KnowledgeArticle) {
  await upsert("knowledge_articles", {
    id: article.id,
    title: article.title,
    category: article.category,
    body: article.body,
    archived: article.archived,
    updated_at: new Date().toISOString()
  });
}

export async function saveSite(site: SiteSettings) {
  const supabase = requiredClient();
  const { data: existing } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  const payload = {
    id: existing?.id,
    brand_name: site.brandName,
    logo_letter: site.logoLetter,
    tagline: site.tagline,
    hero_title: site.heroTitle,
    hero_text: site.heroText,
    primary_color: site.primaryColor,
    secondary_color: site.secondaryColor,
    accent_color: site.accentColor,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("site_settings").upsert(payload);
  if (error) throw new Error(error.message);

  await upsertMany(
    "site_modules",
    site.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      enabled: module.enabled,
      updated_at: new Date().toISOString()
    }))
  );

  await upsertMany(
    "site_pages",
    site.pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      audience: page.audience,
      headline: page.headline,
      body: page.body,
      enabled: page.enabled,
      updated_at: new Date().toISOString()
    }))
  );
}

export async function writeChange(entity: string, action: string) {
  const supabase = requiredClient();
  const { error } = await supabase.from("change_log").insert({ entity, action, actor_id: (await supabase.auth.getUser()).data.user?.id ?? null });
  if (error) throw new Error(error.message);
}

async function selectAll(supabase: SupabaseClient, table: string) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function upsert(table: string, payload: Record<string, unknown>) {
  const supabase = requiredClient();
  const { error } = await supabase.from(table).upsert(payload);
  if (error) throw new Error(error.message);
}

async function upsertMany(table: string, payload: Record<string, unknown>[]) {
  const supabase = requiredClient();
  const { error } = await supabase.from(table).upsert(payload);
  if (error) throw new Error(error.message);
}

function requiredClient() {
  const supabase = getClient();
  if (!supabase) throw new Error("Supabase не подключен. Заполните .env.local и выключите mock-режим.");
  return supabase;
}

function mapSite(settings: any, modules: any[], pages: any[]): SiteSettings {
  return {
    ...demoData.site,
    brandName: settings?.brand_name ?? demoData.site.brandName,
    logoLetter: settings?.logo_letter ?? demoData.site.logoLetter,
    tagline: settings?.tagline ?? demoData.site.tagline,
    heroTitle: settings?.hero_title ?? demoData.site.heroTitle,
    heroText: settings?.hero_text ?? demoData.site.heroText,
    primaryColor: settings?.primary_color ?? demoData.site.primaryColor,
    secondaryColor: settings?.secondary_color ?? demoData.site.secondaryColor,
    accentColor: settings?.accent_color ?? demoData.site.accentColor,
    modules: modules.length
      ? modules.map((module) => ({
          id: module.id,
          title: module.title,
          description: module.description,
          enabled: module.enabled
        }))
      : demoData.site.modules,
    pages: pages.length
      ? pages.map((page) => ({
          id: page.id,
          title: page.title,
          slug: page.slug,
          audience: page.audience,
          headline: page.headline,
          body: page.body,
          enabled: page.enabled
        }))
      : demoData.site.pages
  };
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role,
    companyId: row.company_id ?? undefined,
    title: row.title ?? "",
    avatar: (row.full_name || "?").slice(0, 1).toUpperCase()
  };
}

function mapCompany(row: any): Company {
  return { id: row.id, name: row.name, contact: row.contact, health: row.health };
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    status: row.status,
    ownerId: row.owner_id ?? "",
    deadline: row.deadline,
    progress: row.progress,
    risk: row.risk,
    nextStep: row.next_step,
    budgetVisibleToClient: row.budget_visible_to_client
  };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    title: row.title,
    assigneeId: row.assignee_id ?? "",
    status: row.status,
    priority: row.priority,
    due: row.due,
    internalOnly: row.internal_only
  };
}

function mapDocument(row: any): DocumentItem {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    title: row.title,
    type: row.type,
    status: row.status,
    clientVisible: row.client_visible,
    updatedAt: row.updated_at?.slice(0, 10) ?? ""
  };
}

function mapArticle(row: any): KnowledgeArticle {
  return { id: row.id, title: row.title, category: row.category, body: row.body, archived: row.archived };
}

function mapEvent(row: any): CalendarEvent {
  const startsAt = new Date(row.starts_at);
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    title: row.title,
    date: startsAt.toISOString().slice(0, 10),
    time: startsAt.toISOString().slice(11, 16),
    visibility: row.visibility
  };
}

function mapDiscussion(row: any): Discussion {
  return { id: row.id, projectId: row.project_id ?? undefined, title: row.title, lastMessage: row.last_message, visibility: row.visibility };
}

function mapChange(row: any): ChangeLog {
  return {
    id: row.id,
    entity: row.entity,
    action: row.action,
    actor: "Пользователь",
    at: row.created_at?.replace("T", " ").slice(0, 16) ?? ""
  };
}
