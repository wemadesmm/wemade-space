"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  PackagePlus,
  Palette,
  PenLine,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wand2,
  Wind
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isClient, roleLabels, visibleDiscussions, visibleDocuments, visibleEvents, visibleProjects, visibleTasks } from "@/lib/access";
import { demoData } from "@/lib/demo-data";
import {
  AuthState,
  getAuthState,
  loadSpaceDataFromSupabase,
  onAuthChange,
  saveArticle,
  saveDocument,
  saveEvent,
  saveProject,
  saveSite,
  saveTask,
  saveUser,
  signIn,
  signOut,
  signUp,
  writeChange
} from "@/lib/space-repository";
import { isSupabaseEnabled } from "@/lib/supabase";
import { makeChange, loadSpaceData, saveSpaceData } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CalendarEvent, DocumentItem, KnowledgeArticle, Project, Role, SitePage, SpaceData, Status, Task, User } from "@/lib/types";

type Section =
  | "home"
  | "my"
  | "projects"
  | "tasks"
  | "calendar"
  | "knowledge"
  | "documents"
  | "team"
  | "onboarding"
  | "clients"
  | "reports"
  | "discussions"
  | "culture"
  | "game"
  | "shop"
  | "meditation"
  | "feedback"
  | "builder"
  | "settings";

const projectSchema = z.object({
  name: z.string().min(3, "Минимум 3 символа"),
  companyId: z.string().min(1),
  deadline: z.string().min(1),
  status: z.enum(["active", "review", "risk", "done", "archived"]),
  progress: z.coerce.number().min(0).max(100),
  risk: z.string().min(3),
  nextStep: z.string().min(3)
});

const taskSchema = z.object({
  title: z.string().min(3),
  projectId: z.string().optional(),
  assigneeId: z.string().min(1),
  due: z.string().min(1),
  priority: z.enum(["low", "normal", "high"]),
  internalOnly: z.boolean()
});

const documentSchema = z.object({
  title: z.string().min(3),
  projectId: z.string().optional(),
  type: z.enum(["brief", "contract", "report", "creative", "note"]),
  status: z.enum(["draft", "approval", "approved", "archived"]),
  clientVisible: z.boolean()
});

const articleSchema = z.object({
  title: z.string().min(3),
  category: z.enum(["process", "culture", "client", "onboarding"]),
  body: z.string().min(10)
});

const eventSchema = z.object({
  title: z.string().min(3),
  projectId: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  visibility: z.enum(["internal", "client", "all"])
});

const statusLabels: Record<Status, string> = {
  active: "В работе",
  review: "На согласовании",
  risk: "Риск",
  done: "Готово",
  archived: "Архив"
};

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const navInternal: { id: Section; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Главная", icon: LayoutDashboard },
  { id: "my", label: "Моя работа", icon: Home },
  { id: "projects", label: "Проекты", icon: Briefcase },
  { id: "tasks", label: "Задачи", icon: ListTodo },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "knowledge", label: "База знаний", icon: BookOpen },
  { id: "documents", label: "Документы", icon: FileText },
  { id: "team", label: "Команда", icon: Users },
  { id: "onboarding", label: "Новичкам", icon: Sparkles },
  { id: "clients", label: "Клиенты", icon: ShieldCheck },
  { id: "reports", label: "Отчетность", icon: CheckCircle2 },
  { id: "discussions", label: "Обсуждения", icon: MessageSquare },
  { id: "culture", label: "Культура Wemade", icon: Heart },
  { id: "game", label: "Мини-игра", icon: Wand2 },
  { id: "shop", label: "Магазин приколышей", icon: PackagePlus },
  { id: "meditation", label: "Медитация", icon: Wind },
  { id: "feedback", label: "Обратная связь", icon: PenLine },
  { id: "builder", label: "Конструктор", icon: SlidersHorizontal },
  { id: "settings", label: "Настройки", icon: Settings }
];

const navClient: { id: Section; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Главная", icon: LayoutDashboard },
  { id: "projects", label: "Мои проекты", icon: Briefcase },
  { id: "tasks", label: "План работ", icon: ListTodo },
  { id: "documents", label: "Материалы и согласования", icon: FileText },
  { id: "reports", label: "Отчеты", icon: CheckCircle2 },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "team", label: "Команда проекта", icon: Users },
  { id: "feedback", label: "Запросы", icon: PenLine },
  { id: "discussions", label: "Обсуждения", icon: MessageSquare },
  { id: "settings", label: "Профиль", icon: Settings }
];

export default function WemadeSpace() {
  const [data, setData] = useState<SpaceData>(demoData);
  const [currentUserId, setCurrentUserId] = useState("u1");
  const [section, setSection] = useState<Section>("home");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [auth, setAuth] = useState<AuthState>({ enabled: isSupabaseEnabled(), loading: false, supabaseUser: null });
  const [remoteMode, setRemoteMode] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refreshData();
    return onAuthChange(() => void refreshData());
  }, []);

  useEffect(() => {
    if (!remoteMode && !loadingData) saveSpaceData(data);
  }, [data, loadingData, remoteMode]);

  const user = data.users.find((item) => item.id === currentUserId) ?? data.users[0] ?? demoData.users[0];
  const nav = (isClient(user) ? navClient : navInternal).filter((item) => item.id === "builder" || item.id === "settings" || isSectionEnabled(data, item.id));
  const projects = visibleProjects(data, user);
  const tasks = visibleTasks(data, user);
  const documents = visibleDocuments(data, user);
  const events = visibleEvents(data, user);
  const discussions = visibleDiscussions(data, user);

  useEffect(() => {
    if (!nav.some((item) => item.id === section)) setSection("home");
  }, [nav, section]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => statusFilter === "all" || project.status === statusFilter)
      .filter((project) => project.name.toLowerCase().includes(query.toLowerCase()) || companyName(data, project.companyId).toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sort === "progress" ? b.progress - a.progress : a.deadline.localeCompare(b.deadline)));
  }, [data, projects, query, sort, statusFilter]);

  function commit(next: SpaceData, entity: string, action: string) {
    setData({
      ...next,
      changes: [makeChange(entity, action, user.name), ...next.changes].slice(0, 20)
    });
  }

  function resetDemo() {
    setData(demoData);
  }

  async function refreshData() {
    setLoadingData(true);
    let nextAuth: AuthState;
    try {
      nextAuth = await withTimeout(getAuthState(), 8000, "Supabase слишком долго отвечает. Обновите страницу или попробуйте войти еще раз.");
      setAuth(nextAuth);
    } catch (error) {
      setAuth({ enabled: true, loading: false, supabaseUser: null, error: error instanceof Error ? error.message : "Не удалось проверить вход" });
      setRemoteMode(false);
      setData(loadSpaceData());
      setLoadingData(false);
      return;
    }

    if (nextAuth.enabled && nextAuth.supabaseUser) {
      try {
        const remoteData = await withTimeout(loadSpaceDataFromSupabase(), 10000, "База данных Supabase слишком долго отвечает. Открываю сайт в безопасном режиме.");
        setData(remoteData);
        setCurrentUserId(nextAuth.supabaseUser.id);
        setRemoteMode(true);
        setNotice("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось загрузить Supabase-данные";
        setRemoteMode(false);
        setAuth({ enabled: true, loading: false, supabaseUser: null, error: message });
        setNotice(message);
      } finally {
        setLoadingData(false);
      }
      return;
    }

    setRemoteMode(false);
    setData(loadSpaceData());
    setLoadingData(false);
  }

  async function persistRemote(entity: string, action: string, save: () => Promise<void>) {
    if (!remoteMode) return;
    try {
      await save();
      await writeChange(entity, action);
      const fresh = await loadSpaceDataFromSupabase();
      setData(fresh);
      setNotice("Сохранено в общей базе");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить в Supabase");
    }
  }

  function archiveEntity(kind: "project" | "task" | "document" | "article", id: string) {
    if (kind === "project") {
      const project = data.projects.find((item) => item.id === id);
      const archived = project ? { ...project, status: "archived" as const } : null;
      commit({ ...data, projects: data.projects.map((item) => (item.id === id ? { ...item, status: "archived" } : item)) }, "Проект", "перемещен в архив");
      if (archived) void persistRemote("Проект", "перемещен в архив", () => saveProject(archived));
    }
    if (kind === "task") {
      const task = data.tasks.find((item) => item.id === id);
      const archived = task ? { ...task, status: "archived" as const } : null;
      commit({ ...data, tasks: data.tasks.map((item) => (item.id === id ? { ...item, status: "archived" } : item)) }, "Задача", "перемещена в архив");
      if (archived) void persistRemote("Задача", "перемещена в архив", () => saveTask(archived));
    }
    if (kind === "document") {
      const document = data.documents.find((item) => item.id === id);
      const archived = document ? { ...document, status: "archived" as const } : null;
      commit({ ...data, documents: data.documents.map((item) => (item.id === id ? { ...item, status: "archived" } : item)) }, "Документ", "перемещен в архив");
      if (archived) void persistRemote("Документ", "перемещен в архив", () => saveDocument(archived));
    }
    if (kind === "article") {
      const article = data.knowledge.find((item) => item.id === id);
      const archived = article ? { ...article, archived: true } : null;
      commit({ ...data, knowledge: data.knowledge.map((item) => (item.id === id ? { ...item, archived: true } : item)) }, "База знаний", "статья архивирована");
      if (archived) void persistRemote("База знаний", "статья архивирована", () => saveArticle(archived));
    }
  }

  function updateSite(nextSite: SpaceData["site"], action: string) {
    commit({ ...data, site: nextSite }, "Конструктор", action);
    void persistRemote("Конструктор", action, () => saveSite(nextSite));
  }

  if (loadingData) {
    return <LoadingScreen />;
  }

  if (auth.enabled && !auth.supabaseUser) {
    return <AuthScreen notice={notice || auth.error} onDone={() => void refreshData()} />;
  }

  return (
    <main className="min-h-screen bg-wm-bg" style={{ ["--site-primary" as string]: data.site.primaryColor, ["--site-secondary" as string]: data.site.secondaryColor, ["--site-accent" as string]: data.site.accentColor }}>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-wm-line bg-white/86 px-4 py-5 backdrop-blur-xl lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg font-black text-white shadow-wm" style={{ background: data.site.primaryColor, borderColor: data.site.secondaryColor }}>
            {data.site.logoLetter.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-black leading-tight">{data.site.brandName}</p>
            <p className="text-xs text-wm-muted">{data.site.tagline}</p>
          </div>
        </div>
        <nav className="wm-scrollbar mt-7 flex max-h-[calc(100vh-150px)] flex-col gap-1 overflow-auto pr-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                  section === item.id ? "bg-wm-soft font-bold text-wm-blue" : "text-wm-muted hover:bg-wm-bg hover:text-wm-ink"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-wm-line bg-white/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wm-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-wm-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-wm-blue" placeholder="Искать проекты, задачи, документы, знания" />
            </div>
            <select value={currentUserId} onChange={(event) => setCurrentUserId(event.target.value)} disabled={remoteMode} className="rounded-lg border border-wm-line bg-white px-3 py-2.5 text-sm disabled:opacity-60">
              {data.users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {roleLabels[item.role]}
                </option>
              ))}
            </select>
            {remoteMode ? (
              <button onClick={() => void signOut()} className="rounded-lg border border-wm-line bg-white px-3 py-2.5 text-sm font-semibold text-wm-muted hover:text-wm-blue">Выйти</button>
            ) : (
              <button onClick={resetDemo} className="rounded-lg border border-wm-line bg-white px-3 py-2.5 text-sm font-semibold text-wm-muted hover:text-wm-blue">Сбросить демо</button>
            )}
          </div>
          {notice && <div className="border-t border-wm-line px-4 py-2 text-sm text-wm-muted lg:px-8">{notice}</div>}
          <div className="wm-scrollbar flex gap-2 overflow-auto px-4 pb-3 lg:hidden">
            {nav.map((item) => (
              <button key={item.id} onClick={() => setSection(item.id)} className={cn("shrink-0 rounded-lg border px-3 py-2 text-xs", section === item.id ? "border-wm-blue bg-wm-soft text-wm-blue" : "border-wm-line bg-white text-wm-muted")}>
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="px-4 py-6 lg:px-8">
          <Hero user={user} data={data} projects={projects} tasks={tasks} documents={documents} />

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
            <section className="min-w-0">
              {section === "home" && <HomeView data={data} user={user} projects={projects} tasks={tasks} documents={documents} events={events} discussions={discussions} setSection={setSection} />}
              {section === "my" && <MyWork user={user} tasks={tasks} events={events} />}
              {section === "projects" && (
                <ProjectsView
                  data={data}
                  user={user}
                  projects={filteredProjects}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sort={sort}
                  setSort={setSort}
                  onSave={(project) => {
                    const exists = data.projects.some((item) => item.id === project.id);
                    const projectsNext = exists ? data.projects.map((item) => (item.id === project.id ? project : item)) : [project, ...data.projects];
                    commit({ ...data, projects: projectsNext }, "Проект", exists ? "обновлен" : "создан");
                    void persistRemote("Проект", exists ? "обновлен" : "создан", () => saveProject(project));
                  }}
                  onArchive={(id) => archiveEntity("project", id)}
                />
              )}
              {section === "tasks" && (
                <TasksView
                  data={data}
                  user={user}
                  tasks={tasks}
                  onSave={(task) => {
                    const exists = data.tasks.some((item) => item.id === task.id);
                    const tasksNext = exists ? data.tasks.map((item) => (item.id === task.id ? task : item)) : [task, ...data.tasks];
                    commit({ ...data, tasks: tasksNext }, "Задача", exists ? "обновлена" : "создана");
                    void persistRemote("Задача", exists ? "обновлена" : "создана", () => saveTask(task));
                  }}
                  onArchive={(id) => archiveEntity("task", id)}
                />
              )}
              {section === "documents" && (
                <DocumentsView
                  data={data}
                  user={user}
                  documents={documents}
                  onSave={(document) => {
                    const exists = data.documents.some((item) => item.id === document.id);
                    const documentsNext = exists ? data.documents.map((item) => (item.id === document.id ? document : item)) : [document, ...data.documents];
                    commit({ ...data, documents: documentsNext }, "Документ", exists ? "обновлен" : "создан");
                    void persistRemote("Документ", exists ? "обновлен" : "создан", () => saveDocument(document));
                  }}
                  onArchive={(id) => archiveEntity("document", id)}
                />
              )}
              {section === "knowledge" && (
                <KnowledgeView
                  articles={data.knowledge.filter((item) => !item.archived)}
                  user={user}
                  onSave={(article) => {
                    const exists = data.knowledge.some((item) => item.id === article.id);
                    const knowledge = exists ? data.knowledge.map((item) => (item.id === article.id ? article : item)) : [article, ...data.knowledge];
                    commit({ ...data, knowledge }, "База знаний", exists ? "статья обновлена" : "статья создана");
                    void persistRemote("База знаний", exists ? "статья обновлена" : "статья создана", () => saveArticle(article));
                  }}
                  onArchive={(id) => archiveEntity("article", id)}
                />
              )}
              {section === "calendar" && (
                <CalendarView
                  data={data}
                  user={user}
                  events={events}
                  onSave={(event) => {
                    const exists = data.events.some((item) => item.id === event.id);
                    const eventsNext = exists ? data.events.map((item) => (item.id === event.id ? event : item)) : [event, ...data.events];
                    commit({ ...data, events: eventsNext }, "Календарь", exists ? "событие обновлено" : "событие создано");
                    void persistRemote("Календарь", exists ? "событие обновлено" : "событие создано", () => saveEvent(event));
                  }}
                />
              )}
              {section === "team" && <TeamView data={data} user={user} />}
              {section === "clients" && <ClientsView data={data} />}
              {section === "reports" && <ReportsView projects={projects} documents={documents} />}
              {section === "discussions" && <DiscussionsView discussions={discussions} />}
              {section === "onboarding" && <SimpleView title="Новичкам" icon={Sparkles} items={["Маршрут первых 7 дней", "Карта команды и зон ответственности", "Чеклист доступов", "Первые задачи без перегруза"]} />}
              {section === "culture" && <SimpleView title="Культура Wemade" icon={Heart} items={["Пишем тепло и фиксируем договоренности", "Не тащим хаос в личку, ведем проект в пространстве", "Помогаем друг другу видеть следующий шаг"]} />}
              {section === "game" && <MiniGame />}
              {section === "shop" && <SimpleView title="Магазин приколышей" icon={PackagePlus} items={["Стикерпак за 120", "День без созвонов за 400", "Место в плейлисте офиса за 80"]} />}
              {section === "meditation" && <SimpleView title="Медитация" icon={Wind} items={["2 минуты перед сложным созвоном", "Дыхание после правок", "Фокус-режим на 25 минут"]} />}
              {section === "feedback" && <SimpleView title={isClient(user) ? "Запросы" : "Обратная связь"} icon={PenLine} items={["Создать запрос", "Предложить улучшение", "Сообщить о риске", "Попросить помощь"]} />}
              {section === "builder" && !isClient(user) && <BuilderView data={data} onSave={updateSite} />}
              {section === "settings" && (
                <SettingsView
                  data={data}
                  user={user}
                  onSaveUser={(nextUser) => {
                    commit({ ...data, users: data.users.map((item) => (item.id === nextUser.id ? nextUser : item)) }, "Доступ", "роль пользователя обновлена");
                    void persistRemote("Доступ", "роль пользователя обновлена", () => saveUser(nextUser));
                  }}
                />
              )}
            </section>

            <aside className="space-y-5">
              <AccessPanel user={user} />
              <ChangeLog data={data} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Hero({ user, data, projects, tasks, documents }: { user: User; data: SpaceData; projects: Project[]; tasks: Task[]; documents: DocumentItem[] }) {
  const company = user.companyId ? data.companies.find((item) => item.id === user.companyId)?.name : "Wemade";
  return (
    <section className="overflow-hidden rounded-xl border border-wm-line bg-white shadow-wm">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-wm-blue">
            <span className="rounded-full bg-wm-soft px-3 py-1">{roleLabels[user.role]}</span>
            <span className="rounded-full px-3 py-1" style={{ background: `${data.site.secondaryColor}99` }}>{company}</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">{data.site.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-wm-muted sm:text-base">
            {data.site.heroText}
          </p>
        </div>
        <div className="grid grid-cols-3 border-t border-wm-line text-white lg:border-l lg:border-t-0" style={{ background: data.site.primaryColor }}>
          <Metric label="Проекты" value={projects.length} />
          <Metric label="Задачи" value={tasks.length} />
          <Metric label="Документы" value={documents.length} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/20 p-4 last:border-r-0 sm:p-6">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/80">{label}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-wm-bg p-6">
      <div className="rounded-xl border border-wm-line bg-white p-6 text-center shadow-wm">
        <div className="mx-auto mb-4 h-11 w-11 rounded-lg border-2 border-wm-lime bg-wm-blue" />
        <p className="font-black">Загружаю Пространство Wemade</p>
        <p className="mt-2 text-sm text-wm-muted">Проверяю доступ и данные.</p>
      </div>
    </main>
  );
}

function AuthScreen({ notice, onDone }: { notice?: string; onDone: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp({ email, password, fullName, title });
      }
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не получилось войти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-wm-bg p-4">
      <section className="w-full max-w-md rounded-xl border border-wm-line bg-white p-6 shadow-wm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-wm-lime bg-wm-blue font-black text-white">W</div>
          <div>
            <h1 className="font-black">Пространство Wemade</h1>
            <p className="text-sm text-wm-muted">Вход для команды и клиентов</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-wm-bg p-1 text-sm">
          <button onClick={() => setMode("signin")} className={cn("rounded-md px-3 py-2 font-bold", mode === "signin" && "bg-white text-wm-blue shadow-sm")}>Вход</button>
          <button onClick={() => setMode("signup")} className={cn("rounded-md px-3 py-2 font-bold", mode === "signup" && "bg-white text-wm-blue shadow-sm")}>Регистрация</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <BuilderInput label="Имя" value={fullName} onChange={setFullName} />
              <BuilderInput label="Должность" value={title} onChange={setTitle} />
              <p className="rounded-lg bg-wm-bg px-3 py-2 text-sm text-wm-muted">Новый аккаунт создается как клиентский. Внутренние роли назначает владелец пространства.</p>
            </>
          )}
          <BuilderInput label="Email" value={email} onChange={setEmail} />
          <label className="text-sm font-semibold">
            Пароль
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 w-full rounded-lg border border-wm-line px-3 py-2 outline-none focus:border-wm-blue" />
          </label>
          {(error || notice) && <p className="rounded-lg bg-wm-orange/15 px-3 py-2 text-sm text-wm-orange">{error || notice}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? "Подождите..." : mode === "signin" ? "Войти" : "Создать аккаунт"}</button>
        </form>
      </section>
    </main>
  );
}

function HomeView(props: { data: SpaceData; user: User; projects: Project[]; tasks: Task[]; documents: DocumentItem[]; events: ReturnType<typeof visibleEvents>; discussions: ReturnType<typeof visibleDiscussions>; setSection: (section: Section) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-7" title="Дедлайны и риски" action={<button onClick={() => props.setSection("projects")} className="text-sm font-bold text-wm-blue">Все проекты</button>}>
        <div className="space-y-3">
          {props.projects.slice(0, 4).map((project) => (
            <ProjectLine key={project.id} data={props.data} project={project} />
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-5" title="Ближайшие шаги">
        <div className="space-y-3">
          {props.tasks.slice(0, 5).map((task) => (
            <TaskLine key={task.id} data={props.data} task={task} compact />
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-4" title="Календарь">
        <List items={props.events.map((item) => `${item.date} ${item.time} · ${item.title}`)} />
      </Card>
      <Card className="lg:col-span-4" title="Согласования">
        <List items={props.documents.map((item) => `${item.title} · ${item.status}`)} />
      </Card>
      <Card className="lg:col-span-4" title="Обсуждения">
        <List items={props.discussions.map((item) => `${item.title}: ${item.lastMessage}`)} />
      </Card>
    </div>
  );
}

function ProjectsView(props: { data: SpaceData; user: User; projects: Project[]; statusFilter: string; setStatusFilter: (value: string) => void; sort: string; setSort: (value: string) => void; onSave: (project: Project) => void; onArchive: (id: string) => void }) {
  const [editing, setEditing] = useState<Project | null>(null);
  return (
    <Stack title={isClient(props.user) ? "Мои проекты" : "Проекты"} action={!isClient(props.user) && <button onClick={() => setEditing(emptyProject(props.data))} className="btn-primary"><Plus className="h-4 w-4" />Проект</button>}>
      <Toolbar status={props.statusFilter} setStatus={props.setStatusFilter} sort={props.sort} setSort={props.setSort} />
      <div className="grid gap-4 md:grid-cols-2">
        {props.projects.map((project) => (
          <article key={project.id} className="rounded-xl border border-wm-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-wm-blue">{companyName(props.data, project.companyId)}</p>
                <h3 className="mt-1 text-lg font-black">{project.name}</h3>
              </div>
              <Badge status={project.status} />
            </div>
            <div className="mt-4 h-2 rounded-full bg-wm-bg"><div className="h-2 rounded-full bg-wm-blue" style={{ width: `${project.progress}%` }} /></div>
            <p className="mt-3 text-sm text-wm-muted">До {project.deadline}. Следующий шаг: {project.nextStep}</p>
            <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm", project.status === "risk" ? "bg-wm-orange/15 text-wm-orange" : "bg-wm-bg text-wm-muted")}>{project.risk}</p>
            {!isClient(props.user) && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(project)} className="btn-ghost"><PenLine className="h-4 w-4" />Изменить</button>
                <button onClick={() => props.onArchive(project.id)} className="btn-ghost"><Archive className="h-4 w-4" />Архив</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {editing && <ProjectForm data={props.data} project={editing} onClose={() => setEditing(null)} onSave={(project) => { props.onSave(project); setEditing(null); }} />}
    </Stack>
  );
}

function TasksView(props: { data: SpaceData; user: User; tasks: Task[]; onSave: (task: Task) => void; onArchive: (id: string) => void }) {
  const [editing, setEditing] = useState<Task | null>(null);
  return (
    <Stack title={isClient(props.user) ? "План работ" : "Задачи"} action={!isClient(props.user) && <button onClick={() => setEditing(emptyTask(props.data, props.user))} className="btn-primary"><Plus className="h-4 w-4" />Задача</button>}>
      <div className="space-y-3">
        {props.tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-wm-line bg-white p-4">
            <TaskLine data={props.data} task={task} />
            {!isClient(props.user) && <div className="mt-3 flex gap-2"><button onClick={() => setEditing(task)} className="btn-ghost">Изменить</button><button onClick={() => props.onArchive(task.id)} className="btn-ghost">Архив</button></div>}
          </div>
        ))}
      </div>
      {editing && <TaskForm data={props.data} task={editing} onClose={() => setEditing(null)} onSave={(task) => { props.onSave(task); setEditing(null); }} />}
    </Stack>
  );
}

function DocumentsView(props: { data: SpaceData; user: User; documents: DocumentItem[]; onSave: (document: DocumentItem) => void; onArchive: (id: string) => void }) {
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  return (
    <Stack title={isClient(props.user) ? "Материалы и согласования" : "Документы"} action={!isClient(props.user) && <button onClick={() => setEditing(emptyDocument())} className="btn-primary"><Plus className="h-4 w-4" />Документ</button>}>
      <div className="grid gap-4 md:grid-cols-2">
        {props.documents.map((document) => (
          <article key={document.id} className="rounded-xl border border-wm-line bg-white p-5">
            <p className="text-xs font-bold uppercase text-wm-blue">{document.type}</p>
            <h3 className="mt-1 font-black">{document.title}</h3>
            <p className="mt-2 text-sm text-wm-muted">Статус: {document.status}. Обновлен: {document.updatedAt}</p>
            {!isClient(props.user) && <p className="mt-2 text-xs text-wm-muted">{document.clientVisible ? "Виден клиенту" : "Только внутри"}</p>}
            {!isClient(props.user) && <div className="mt-4 flex gap-2"><button onClick={() => setEditing(document)} className="btn-ghost">Изменить</button><button onClick={() => props.onArchive(document.id)} className="btn-ghost">Архив</button></div>}
          </article>
        ))}
      </div>
      {editing && <DocumentForm data={props.data} document={editing} onClose={() => setEditing(null)} onSave={(document) => { props.onSave(document); setEditing(null); }} />}
    </Stack>
  );
}

function KnowledgeView(props: { articles: KnowledgeArticle[]; user: User; onSave: (article: KnowledgeArticle) => void; onArchive: (id: string) => void }) {
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  return (
    <Stack title="База знаний" action={!isClient(props.user) && <button onClick={() => setEditing({ id: crypto.randomUUID(), title: "", body: "", category: "process", archived: false })} className="btn-primary"><Plus className="h-4 w-4" />Статья</button>}>
      <div className="grid gap-4 md:grid-cols-2">
        {props.articles.map((article) => (
          <article key={article.id} className="rounded-xl border border-wm-line bg-white p-5">
            <p className="text-xs font-bold uppercase text-wm-blue">{article.category}</p>
            <h3 className="mt-1 font-black">{article.title}</h3>
            <p className="mt-2 text-sm leading-6 text-wm-muted">{article.body}</p>
            {!isClient(props.user) && <div className="mt-4 flex gap-2"><button onClick={() => setEditing(article)} className="btn-ghost">Изменить</button><button onClick={() => props.onArchive(article.id)} className="btn-ghost">Архив</button></div>}
          </article>
        ))}
      </div>
      {editing && <ArticleForm article={editing} onClose={() => setEditing(null)} onSave={(article) => { props.onSave(article); setEditing(null); }} />}
    </Stack>
  );
}

function BuilderView({ data, onSave }: { data: SpaceData; onSave: (site: SpaceData["site"], action: string) => void }) {
  const [draft, setDraft] = useState(data.site);

  useEffect(() => setDraft(data.site), [data.site]);

  function updatePage(id: string, patch: Partial<SitePage>) {
    setDraft({
      ...draft,
      pages: draft.pages.map((page) => (page.id === id ? { ...page, ...patch } : page))
    });
  }

  function addPage() {
    setDraft({
      ...draft,
      pages: [
        ...draft.pages,
        {
          id: crypto.randomUUID(),
          title: "Новая страница",
          slug: "/new-page",
          audience: "all",
          headline: "Заголовок страницы",
          body: "Опишите, что человек должен здесь увидеть или сделать.",
          enabled: true
        }
      ]
    });
  }

  return (
    <Stack
      title="Конструктор сайта"
      action={
        <button onClick={() => onSave(draft, "настройки сайта сохранены")} className="btn-primary">
          <CheckCircle2 className="h-4 w-4" />
          Сохранить
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title="Бренд и первый экран">
            <div className="form-grid">
              <BuilderInput label="Название" value={draft.brandName} onChange={(value) => setDraft({ ...draft, brandName: value })} />
              <BuilderInput label="Логотип / буквы" value={draft.logoLetter} onChange={(value) => setDraft({ ...draft, logoLetter: value })} />
              <BuilderInput label="Подпись в меню" value={draft.tagline} onChange={(value) => setDraft({ ...draft, tagline: value })} />
              <BuilderInput label="Главный заголовок" value={draft.heroTitle} onChange={(value) => setDraft({ ...draft, heroTitle: value })} />
              <label className="md:col-span-2 text-sm font-semibold">
                Текст на главной
                <textarea value={draft.heroText} onChange={(event) => setDraft({ ...draft, heroText: event.target.value })} className="mt-1 min-h-28 w-full rounded-lg border border-wm-line p-3 outline-none focus:border-wm-blue" />
              </label>
            </div>
          </Card>

          <Card title="Цвета">
            <div className="grid gap-3 md:grid-cols-3">
              <ColorInput label="Основной" value={draft.primaryColor} onChange={(value) => setDraft({ ...draft, primaryColor: value })} />
              <ColorInput label="Дополнительный" value={draft.secondaryColor} onChange={(value) => setDraft({ ...draft, secondaryColor: value })} />
              <ColorInput label="Акцент" value={draft.accentColor} onChange={(value) => setDraft({ ...draft, accentColor: value })} />
            </div>
          </Card>

          <Card title="Разделы продукта">
            <div className="grid gap-3 md:grid-cols-2">
              {draft.modules.map((module) => (
                <label key={module.id} className="flex items-start gap-3 rounded-lg border border-wm-line bg-wm-bg p-3">
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        modules: draft.modules.map((item) => (item.id === module.id ? { ...item, enabled: event.target.checked } : item))
                      })
                    }
                    className="mt-1 h-4 w-4 accent-wm-blue"
                  />
                  <span>
                    <span className="block font-bold">{module.title}</span>
                    <span className="text-sm text-wm-muted">{module.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Страницы" action={<button onClick={addPage} className="btn-ghost"><Plus className="h-4 w-4" />Страница</button>}>
            <div className="space-y-4">
              {draft.pages.map((page) => (
                <div key={page.id} className="rounded-xl border border-wm-line bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={page.enabled} onChange={(event) => updatePage(page.id, { enabled: event.target.checked })} className="h-4 w-4 accent-wm-blue" />
                      Страница включена
                    </label>
                    <select value={page.audience} onChange={(event) => updatePage(page.id, { audience: event.target.value as SitePage["audience"] })} className="rounded-lg border border-wm-line bg-white px-3 py-2 text-sm">
                      <option value="all">Все</option>
                      <option value="internal">Команда</option>
                      <option value="client">Клиенты</option>
                    </select>
                  </div>
                  <div className="form-grid">
                    <BuilderInput label="Название" value={page.title} onChange={(value) => updatePage(page.id, { title: value })} />
                    <BuilderInput label="Адрес" value={page.slug} onChange={(value) => updatePage(page.id, { slug: value })} />
                    <BuilderInput label="Заголовок" value={page.headline} onChange={(value) => updatePage(page.id, { headline: value })} />
                    <BuilderInput label="Описание" value={page.body} onChange={(value) => updatePage(page.id, { body: value })} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card title="Предпросмотр">
            <div className="overflow-hidden rounded-xl border border-wm-line bg-white">
              <div className="p-4 text-white" style={{ background: draft.primaryColor }}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border-2 font-black" style={{ borderColor: draft.secondaryColor }}>
                  {draft.logoLetter.slice(0, 2)}
                </div>
                <p className="text-xs uppercase text-white/80">{draft.brandName}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight">{draft.heroTitle}</h3>
                <p className="mt-2 text-sm text-white/80">{draft.heroText}</p>
              </div>
              <div className="p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Palette className="h-4 w-4" />Активные разделы</p>
                <List items={draft.modules.filter((item) => item.enabled).map((item) => item.title)} />
              </div>
            </div>
          </Card>

          <Card title="Публикация">
            <div className="space-y-3 text-sm text-wm-muted">
              <p>Изменения конструктора сохраняются в общей базе Supabase и видны всем пользователям после обновления страницы.</p>
              <p>Разделы сайта, роли и данные работают через единое пространство команды и клиентов.</p>
            </div>
          </Card>
        </aside>
      </div>
    </Stack>
  );
}

function ProjectForm({ data, project, onSave, onClose }: { data: SpaceData; project: Project; onSave: (project: Project) => void; onClose: () => void }) {
  const form = useForm<any>({ resolver: zodResolver(projectSchema), defaultValues: project });
  return <Modal title="Проект" onClose={onClose}><form onSubmit={form.handleSubmit((values) => onSave({ ...project, ...values }))} className="form-grid"><Input form={form} name="name" label="Название" /><Select form={form} name="companyId" label="Компания" options={data.companies.map((item) => [item.id, item.name])} /><Input form={form} name="deadline" label="Дедлайн" type="date" /><Select form={form} name="status" label="Статус" options={Object.entries(statusLabels)} /><Input form={form} name="progress" label="Прогресс" type="number" /><Input form={form} name="risk" label="Риск" /><Input form={form} name="nextStep" label="Следующий шаг" /><button className="btn-primary md:col-span-2">Сохранить</button></form></Modal>;
}

function TaskForm({ data, task, onSave, onClose }: { data: SpaceData; task: Task; onSave: (task: Task) => void; onClose: () => void }) {
  const form = useForm<any>({ resolver: zodResolver(taskSchema), defaultValues: task });
  return <Modal title="Задача" onClose={onClose}><form onSubmit={form.handleSubmit((values) => onSave({ ...task, ...values, projectId: values.projectId || undefined, status: task.status === "archived" ? "active" : task.status }))} className="form-grid"><Input form={form} name="title" label="Название" /><Select form={form} name="projectId" label="Проект" options={[["", "Личная задача"], ...data.projects.map((item) => [item.id, item.name] as [string, string])]} /><Select form={form} name="assigneeId" label="Ответственный" options={data.users.filter((item) => item.role !== "client").map((item) => [item.id, item.name])} /><Input form={form} name="due" label="Срок" type="date" /><Select form={form} name="priority" label="Приоритет" options={[["low", "Низкий"], ["normal", "Обычный"], ["high", "Высокий"]]} /><Checkbox form={form} name="internalOnly" label="Только внутри" /><button className="btn-primary md:col-span-2">Сохранить</button></form></Modal>;
}

function DocumentForm({ data, document, onSave, onClose }: { data: SpaceData; document: DocumentItem; onSave: (document: DocumentItem) => void; onClose: () => void }) {
  const form = useForm<any>({ resolver: zodResolver(documentSchema), defaultValues: document });
  return <Modal title="Документ" onClose={onClose}><form onSubmit={form.handleSubmit((values) => onSave({ ...document, ...values, projectId: values.projectId || undefined, updatedAt: new Date().toISOString().slice(0, 10) }))} className="form-grid"><Input form={form} name="title" label="Название" /><Select form={form} name="projectId" label="Проект" options={[["", "Без проекта"], ...data.projects.map((item) => [item.id, item.name] as [string, string])]} /><Select form={form} name="type" label="Тип" options={[["brief", "Бриф"], ["contract", "Договор"], ["report", "Отчет"], ["creative", "Креатив"], ["note", "Заметка"]]} /><Select form={form} name="status" label="Статус" options={[["draft", "Черновик"], ["approval", "Согласование"], ["approved", "Согласован"], ["archived", "Архив"]]} /><Checkbox form={form} name="clientVisible" label="Виден клиенту" /><button className="btn-primary md:col-span-2">Сохранить</button></form></Modal>;
}

function EventForm({ data, event, onSave, onClose }: { data: SpaceData; event: CalendarEvent; onSave: (event: CalendarEvent) => void; onClose: () => void }) {
  const form = useForm<any>({ resolver: zodResolver(eventSchema), defaultValues: event });
  return (
    <Modal title="Событие" onClose={onClose}>
      <form onSubmit={form.handleSubmit((values) => onSave({ ...event, ...values, projectId: values.projectId || undefined }))} className="form-grid">
        <Input form={form} name="title" label="Название" />
        <Select form={form} name="projectId" label="Проект" options={[["", "Без проекта"], ...data.projects.map((item) => [item.id, item.name] as [string, string])]} />
        <Input form={form} name="date" label="Дата" type="date" />
        <Input form={form} name="time" label="Время" type="time" />
        <Select form={form} name="visibility" label="Видимость" options={[["internal", "Только команда"], ["client", "Клиент и команда"], ["all", "Все"]]} />
        <button className="btn-primary md:col-span-2">Сохранить</button>
      </form>
    </Modal>
  );
}

function ArticleForm({ article, onSave, onClose }: { article: KnowledgeArticle; onSave: (article: KnowledgeArticle) => void; onClose: () => void }) {
  const form = useForm<any>({ resolver: zodResolver(articleSchema), defaultValues: article });
  return <Modal title="Статья базы знаний" onClose={onClose}><form onSubmit={form.handleSubmit((values) => onSave({ ...article, ...values }))} className="form-grid"><Input form={form} name="title" label="Название" /><Select form={form} name="category" label="Категория" options={[["process", "Процессы"], ["culture", "Культура"], ["client", "Клиенты"], ["onboarding", "Новичкам"]]} /><label className="md:col-span-2 text-sm font-semibold">Текст<textarea {...form.register("body")} className="mt-1 min-h-28 w-full rounded-lg border border-wm-line p-3 outline-none focus:border-wm-blue" /></label><button className="btn-primary md:col-span-2">Сохранить</button></form></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-wm-ink/35 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-wm"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="rounded-lg border border-wm-line px-3 py-2">Закрыть</button></div>{children}</div></div>;
}

function Card({ title, children, action, className }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-wm-line bg-white p-5 shadow-sm", className)}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black">{title}</h2>{action}</div>{children}</section>;
}

function Stack({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">{title}</h2>{action}</div>{children}</section>;
}

function Toolbar({ status, setStatus, sort, setSort }: { status: string; setStatus: (value: string) => void; sort: string; setSort: (value: string) => void }) {
  return <div className="mb-4 flex flex-wrap gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-wm-line bg-white px-3 py-2 text-sm"><option value="all">Все статусы</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-wm-line bg-white px-3 py-2 text-sm"><option value="deadline">По дедлайну</option><option value="progress">По прогрессу</option></select></div>;
}

function Badge({ status }: { status: Status }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-bold", status === "risk" ? "bg-wm-orange/15 text-wm-orange" : status === "done" ? "bg-wm-lime/50 text-wm-ink" : "bg-wm-soft text-wm-blue")}>{statusLabels[status]}</span>;
}

function AccessPanel({ user }: { user: User }) {
  return <Card title="Доступ"><div className="space-y-3 text-sm text-wm-muted"><p><b className="text-wm-ink">{user.name}</b> · {roleLabels[user.role]}</p><p>{isClient(user) ? "Клиентский контур показывает только проекты, документы, события и обсуждения своей компании." : "Внутренний контур открывает операционные разделы команды и скрытые материалы."}</p><div className="rounded-lg bg-wm-soft p-3 text-wm-blue"><ShieldCheck className="mb-2 h-5 w-5" />Фильтрация применена на уровне данных интерфейса; SQL RLS подготовлен в миграции.</div></div></Card>;
}

function ChangeLog({ data }: { data: SpaceData }) {
  return <Card title="История"><div className="space-y-3">{data.changes.slice(0, 6).map((item) => <div key={item.id} className="text-sm"><p className="font-semibold">{item.entity}: {item.action}</p><p className="text-xs text-wm-muted">{item.actor} · {item.at}</p></div>)}</div></Card>;
}

function MyWork({ user, tasks, events }: { user: User; tasks: Task[]; events: ReturnType<typeof visibleEvents> }) {
  return <div className="grid gap-5 md:grid-cols-2"><Card title="Мои задачи"><div className="space-y-3">{tasks.filter((item) => item.assigneeId === user.id).map((item) => <div key={item.id} className="rounded-lg bg-wm-bg p-3 text-sm">{item.title}<p className="text-xs text-wm-muted">{item.due}</p></div>)}</div></Card><Card title="Сегодня и дальше"><List items={events.map((item) => `${item.date} ${item.time} · ${item.title}`)} /></Card></div>;
}

function CalendarView({ data, user, events, onSave }: { data: SpaceData; user: User; events: ReturnType<typeof visibleEvents>; onSave: (event: CalendarEvent) => void }) {
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const sortedEvents = [...events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const grouped = sortedEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    acc[event.date] = [...(acc[event.date] ?? []), event];
    return acc;
  }, {});

  return (
    <Stack title="Календарь" action={!isClient(user) && <button onClick={() => setEditing(emptyEvent())} className="btn-primary"><Plus className="h-4 w-4" />Событие</button>}>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card title="Ближайшее">
          <List items={sortedEvents.slice(0, 6).map((item) => `${item.date} ${item.time} · ${item.title}`)} />
        </Card>
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date} className="rounded-xl border border-wm-line bg-white p-4">
              <h3 className="mb-3 font-black">{date}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <article key={item.id} className="rounded-lg bg-wm-bg p-3">
                    <Clock3 className="mb-2 h-4 w-4 text-wm-blue" />
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="text-sm text-wm-muted">{item.time} · {visibilityLabel(item.visibility)}</p>
                    {item.projectId && <p className="mt-1 text-xs text-wm-muted">{data.projects.find((project) => project.id === item.projectId)?.name}</p>}
                    {!isClient(user) && <button onClick={() => setEditing(item)} className="btn-ghost mt-3">Изменить</button>}
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!sortedEvents.length && <Card title="Пока пусто"><p className="text-sm text-wm-muted">Добавьте первое событие, созвон, дедлайн или внутреннюю встречу.</p></Card>}
        </div>
      </div>
      {editing && <EventForm data={data} event={editing} onClose={() => setEditing(null)} onSave={(event) => { onSave(event); setEditing(null); }} />}
    </Stack>
  );
}

function TeamView({ data, user }: { data: SpaceData; user: User }) {
  const team = isClient(user) ? data.users.filter((item) => item.role !== "client") : data.users;
  return <Stack title="Команда"><div className="grid gap-4 md:grid-cols-3">{team.map((item) => <div key={item.id} className="rounded-xl border border-wm-line bg-white p-5"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-wm-blue font-black text-white">{item.avatar}</div><h3 className="font-black">{item.name}</h3><p className="text-sm text-wm-muted">{item.title}</p></div>)}</div></Stack>;
}

function ClientsView({ data }: { data: SpaceData }) {
  return <Stack title="Клиенты"><div className="grid gap-4 md:grid-cols-3">{data.companies.map((item) => <div key={item.id} className="rounded-xl border border-wm-line bg-white p-5"><h3 className="font-black">{item.name}</h3><p className="mt-2 text-sm text-wm-muted">Контакт: {item.contact}</p><p className="mt-2 text-xs font-bold uppercase text-wm-blue">{item.health}</p></div>)}</div></Stack>;
}

function ReportsView({ projects, documents }: { projects: Project[]; documents: DocumentItem[] }) {
  return <Stack title="Отчетность"><div className="grid gap-4 md:grid-cols-3"><Card title="Средний прогресс"><p className="text-4xl font-black text-wm-blue">{Math.round(projects.reduce((sum, item) => sum + item.progress, 0) / Math.max(projects.length, 1))}%</p></Card><Card title="На согласовании"><p className="text-4xl font-black text-wm-orange">{documents.filter((item) => item.status === "approval").length}</p></Card><Card title="Риски"><p className="text-4xl font-black text-wm-blue">{projects.filter((item) => item.status === "risk").length}</p></Card></div></Stack>;
}

function DiscussionsView({ discussions }: { discussions: ReturnType<typeof visibleDiscussions> }) {
  return <Stack title="Обсуждения"><div className="space-y-3">{discussions.map((item) => <div key={item.id} className="rounded-xl border border-wm-line bg-white p-4"><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm text-wm-muted">{item.lastMessage}</p></div>)}</div></Stack>;
}

function SimpleView({ title, icon: Icon, items }: { title: string; icon: typeof Home; items: string[] }) {
  return <Stack title={title}><div className="grid gap-4 md:grid-cols-2">{items.map((item) => <div key={item} className="rounded-xl border border-wm-line bg-white p-5"><Icon className="mb-3 h-5 w-5 text-wm-blue" /><h3 className="font-black">{item}</h3></div>)}</div></Stack>;
}

function MiniGame() {
  const [score, setScore] = useState(0);
  return <Stack title="Мини-игра"><div className="rounded-xl border border-wm-line bg-white p-6 text-center"><p className="text-sm text-wm-muted">Нажимайте, чтобы собрать фокус-баллы между задачами.</p><button onClick={() => setScore(score + 1)} className="mt-5 rounded-xl border-2 border-wm-lime bg-wm-blue px-8 py-5 text-3xl font-black text-white">{score}</button></div></Stack>;
}

function SettingsView({ data, user, onSaveUser }: { data: SpaceData; user: User; onSaveUser: (user: User) => void }) {
  const canManageAccess = ["owner", "ops"].includes(user.role);
  const roleOptions: Role[] = ["owner", "ops", "pm", "employee", "newcomer", "contractor", "client"];

  return (
    <Stack title="Настройки">
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Профиль">
          <div className="space-y-3 text-sm text-wm-muted">
            <p><b className="text-wm-ink">{user.name}</b> · {roleLabels[user.role]}</p>
            <p>{user.title || "Должность пока не указана"}</p>
            <button onClick={() => void signOut()} className="btn-ghost">Выйти</button>
          </div>
        </Card>

        {canManageAccess && (
          <Card title="Доступы команды">
            <div className="space-y-3">
              {data.users.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-lg border border-wm-line bg-wm-bg p-3 md:grid-cols-[1fr_180px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.name}</p>
                    <p className="text-xs text-wm-muted">{item.title || "Без должности"}</p>
                  </div>
                  <select
                    value={item.role}
                    onChange={(event) => onSaveUser({ ...item, role: event.target.value as Role })}
                    className="rounded-lg border border-wm-line bg-white px-3 py-2 text-sm"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{roleLabels[role]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Stack>
  );
}

function ProjectLine({ data, project }: { data: SpaceData; project: Project }) {
  return <div className="rounded-lg border border-wm-line bg-wm-bg p-3"><div className="flex justify-between gap-3"><div><p className="font-bold">{project.name}</p><p className="text-xs text-wm-muted">{companyName(data, project.companyId)}</p></div><Badge status={project.status} /></div><p className="mt-2 text-sm text-wm-muted">{project.deadline} · {project.nextStep}</p></div>;
}

function TaskLine({ data, task, compact }: { data: SpaceData; task: Task; compact?: boolean }) {
  const assignee = data.users.find((item) => item.id === task.assigneeId)?.name;
  return <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-wm-blue" /><div><p className={cn("font-bold", compact && "text-sm")}>{task.title}</p><p className="text-xs text-wm-muted">{assignee} · до {task.due} · {task.priority}</p></div></div>;
}

function List({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.length ? items.map((item) => <li key={item} className="rounded-lg bg-wm-bg px-3 py-2 text-sm text-wm-muted">{item}</li>) : <li className="text-sm text-wm-muted">Пока пусто</li>}</ul>;
}

function companyName(data: SpaceData, id: string) {
  return data.companies.find((item) => item.id === id)?.name ?? "Без компании";
}

function isSectionEnabled(data: SpaceData, section: Section) {
  const module = data.site.modules.find((item) => item.id === section);
  return module ? module.enabled : true;
}

function visibilityLabel(visibility: CalendarEvent["visibility"]) {
  return visibility === "internal" ? "Только команда" : visibility === "client" ? "Клиент и команда" : "Все";
}

function emptyProject(data: SpaceData): Project {
  return { id: crypto.randomUUID(), companyId: data.companies[0]?.id ?? "", name: "", status: "active", ownerId: data.users[0]?.id ?? "", deadline: new Date().toISOString().slice(0, 10), progress: 0, risk: "Рисков нет", nextStep: "Определить следующий шаг", budgetVisibleToClient: false };
}

function emptyTask(data: SpaceData, user: User): Task {
  return { id: crypto.randomUUID(), title: "", assigneeId: user.id, due: new Date().toISOString().slice(0, 10), priority: "normal", status: "active", internalOnly: !isClient(user), projectId: data.projects[0]?.id };
}

function emptyDocument(): DocumentItem {
  return { id: crypto.randomUUID(), title: "", type: "brief", status: "draft", clientVisible: false, updatedAt: new Date().toISOString().slice(0, 10) };
}

function emptyEvent(): CalendarEvent {
  return { id: crypto.randomUUID(), title: "", date: new Date().toISOString().slice(0, 10), time: "10:00", visibility: "internal" };
}

function Input({ form, name, label, type = "text" }: { form: any; name: string; label: string; type?: string }) {
  return <label className="text-sm font-semibold">{label}<input type={type} {...form.register(name)} className="mt-1 w-full rounded-lg border border-wm-line px-3 py-2 outline-none focus:border-wm-blue" /></label>;
}

function Select({ form, name, label, options }: { form: any; name: string; label: string; options: [string, string][] }) {
  return <label className="text-sm font-semibold">{label}<select {...form.register(name)} className="mt-1 w-full rounded-lg border border-wm-line px-3 py-2 outline-none focus:border-wm-blue">{options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>;
}

function Checkbox({ form, name, label }: { form: any; name: string; label: string }) {
  return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" {...form.register(name)} className="h-4 w-4 accent-wm-blue" />{label}</label>;
}

function BuilderInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-wm-line px-3 py-2 outline-none focus:border-wm-blue" />
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <span className="mt-1 flex overflow-hidden rounded-lg border border-wm-line bg-white">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 border-0 bg-transparent p-1" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 px-3 text-sm outline-none" />
      </span>
    </label>
  );
}
