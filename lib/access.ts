import { CalendarEvent, Discussion, DocumentItem, Project, Role, SpaceData, Task, User } from "./types";

export const roleLabels: Record<Role, string> = {
  owner: "Владелец",
  ops: "Опердиректор",
  pm: "Руководитель проектов",
  employee: "Сотрудник",
  newcomer: "Новичок",
  contractor: "Подрядчик",
  client: "Клиент"
};

export function isClient(user: User) {
  return user.role === "client";
}

export function visibleProjects(data: SpaceData, user: User): Project[] {
  if (!isClient(user)) return data.projects.filter((project) => project.status !== "archived");
  return data.projects.filter((project) => project.companyId === user.companyId && project.status !== "archived");
}

export function visibleTasks(data: SpaceData, user: User): Task[] {
  if (!isClient(user)) return data.tasks.filter((task) => task.status !== "archived");
  const projectIds = new Set(visibleProjects(data, user).map((project) => project.id));
  return data.tasks.filter((task) => task.projectId && projectIds.has(task.projectId) && !task.internalOnly && task.status !== "archived");
}

export function visibleDocuments(data: SpaceData, user: User): DocumentItem[] {
  if (!isClient(user)) return data.documents.filter((document) => document.status !== "archived");
  const projectIds = new Set(visibleProjects(data, user).map((project) => project.id));
  return data.documents.filter((document) => document.projectId && projectIds.has(document.projectId) && document.clientVisible && document.status !== "archived");
}

export function visibleEvents(data: SpaceData, user: User): CalendarEvent[] {
  if (!isClient(user)) return data.events;
  const projectIds = new Set(visibleProjects(data, user).map((project) => project.id));
  return data.events.filter((event) => event.visibility !== "internal" && (!event.projectId || projectIds.has(event.projectId)));
}

export function visibleDiscussions(data: SpaceData, user: User): Discussion[] {
  if (!isClient(user)) return data.discussions;
  const projectIds = new Set(visibleProjects(data, user).map((project) => project.id));
  return data.discussions.filter((discussion) => discussion.visibility === "client" && discussion.projectId && projectIds.has(discussion.projectId));
}
