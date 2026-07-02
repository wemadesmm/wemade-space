"use client";

import { demoData } from "./demo-data";
import { ChangeLog, SpaceData } from "./types";

const KEY = "wemade-space-data-v1";

export function loadSpaceData(): SpaceData {
  if (typeof window === "undefined") return demoData;
  const saved = window.localStorage.getItem(KEY);
  if (!saved) return demoData;
  try {
    return mergeWithDemo(JSON.parse(saved) as Partial<SpaceData>);
  } catch {
    return demoData;
  }
}

export function saveSpaceData(data: SpaceData) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function makeChange(entity: string, action: string, actor: string): ChangeLog {
  return {
    id: crypto.randomUUID(),
    entity,
    action,
    actor,
    at: new Date().toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
  };
}

function mergeWithDemo(saved: Partial<SpaceData>): SpaceData {
  return {
    ...demoData,
    ...saved,
    site: {
      ...demoData.site,
      ...saved.site,
      modules: saved.site?.modules ?? demoData.site.modules,
      pages: saved.site?.pages ?? demoData.site.pages
    }
  };
}
