import { SpaceData } from "./types";

export const demoData: SpaceData = {
  site: {
    brandName: "Пространство Wemade",
    logoLetter: "W",
    tagline: "Команда и клиенты",
    heroTitle: "Пространство Wemade",
    heroText: "Единая рабочая система для проектов, задач, документов, согласований, знаний и клиентской коммуникации.",
    primaryColor: "#3B39FF",
    secondaryColor: "#B8FF34",
    accentColor: "#F57644",
    modules: [
      { id: "projects", title: "Проекты", description: "Статусы, дедлайны, риски и следующий шаг.", enabled: true },
      { id: "tasks", title: "Задачи", description: "Личные, проектные и клиентские задачи.", enabled: true },
      { id: "documents", title: "Документы", description: "Материалы, отчеты и согласования.", enabled: true },
      { id: "knowledge", title: "База знаний", description: "Процессы, культура и адаптация.", enabled: true },
      { id: "game", title: "Мини-игра", description: "Легкий внутренний перерыв.", enabled: true },
      { id: "shop", title: "Магазин приколышей", description: "Внутренние бонусы и приятности.", enabled: true }
    ],
    pages: [
      {
        id: "page-home",
        title: "Главная",
        slug: "/",
        audience: "all",
        headline: "Все рабочее пространство в одном месте",
        body: "Команда видит операционную картину, клиенты видят прозрачный и спокойный личный кабинет.",
        enabled: true
      },
      {
        id: "page-client",
        title: "Кабинет клиента",
        slug: "/client",
        audience: "client",
        headline: "Клиент понимает, что происходит по проекту",
        body: "Статусы, материалы, отчеты, календарь и запросы собраны в безопасном контуре.",
        enabled: true
      }
    ]
  },
  users: [
    { id: "u1", name: "Лена", role: "ops", title: "Операционный директор", avatar: "Л" },
    { id: "u2", name: "Марина", role: "pm", title: "Руководитель проектов", avatar: "М" },
    { id: "u3", name: "Денис", role: "employee", title: "Дизайнер", avatar: "Д" },
    { id: "u4", name: "Саша", role: "newcomer", title: "Junior SMM", avatar: "С" },
    { id: "u5", name: "Анна Клиент", role: "client", companyId: "c1", title: "Маркетинг-директор", avatar: "А" }
  ],
  companies: [
    { id: "c1", name: "ООО «Платежи и точка»", contact: "Анна Клиент", health: "good" },
    { id: "c2", name: "Клиника «Зеленый лист»", contact: "Илья Романов", health: "watch" },
    { id: "c3", name: "Торговый дом «Первый лед»", contact: "Ника Гордеева", health: "risk" }
  ],
  projects: [
    {
      id: "p1",
      companyId: "c1",
      name: "Линейка «Северное сияние»",
      status: "active",
      ownerId: "u2",
      deadline: "2026-07-18",
      progress: 68,
      risk: "Ждем финальные фото продукта",
      nextStep: "Согласовать сценарий коротких роликов",
      budgetVisibleToClient: false
    },
    {
      id: "p2",
      companyId: "c2",
      name: "Репутация и контент клиники",
      status: "review",
      ownerId: "u2",
      deadline: "2026-07-24",
      progress: 42,
      risk: "Нужны комментарии врача по экспертным постам",
      nextStep: "Отправить пакет тем на согласование",
      budgetVisibleToClient: false
    },
    {
      id: "p3",
      companyId: "c3",
      name: "Летняя коллекция чая",
      status: "risk",
      ownerId: "u1",
      deadline: "2026-07-10",
      progress: 31,
      risk: "Съемка сдвинулась, есть риск дедлайна",
      nextStep: "Пересобрать календарь публикаций",
      budgetVisibleToClient: false
    }
  ],
  tasks: [
    { id: "t1", projectId: "p1", title: "Подготовить мудборд для Reels", assigneeId: "u3", status: "active", priority: "high", due: "2026-07-05", internalOnly: false },
    { id: "t2", projectId: "p1", title: "Проверить договоренности по съемке", assigneeId: "u2", status: "review", priority: "normal", due: "2026-07-06", internalOnly: true },
    { id: "t3", title: "Личная заметка: разобрать входящие идеи", assigneeId: "u1", status: "active", priority: "low", due: "2026-07-04", internalOnly: true },
    { id: "t4", projectId: "p2", title: "Собрать вопросы врачу", assigneeId: "u4", status: "active", priority: "normal", due: "2026-07-07", internalOnly: false }
  ],
  documents: [
    { id: "d1", projectId: "p1", title: "Бриф кампании Q3", type: "brief", status: "approved", clientVisible: true, updatedAt: "2026-07-01" },
    { id: "d2", projectId: "p1", title: "Внутренний расчет ресурсов", type: "note", status: "draft", clientVisible: false, updatedAt: "2026-07-02" },
    { id: "d3", projectId: "p2", title: "Отчет за июнь", type: "report", status: "approval", clientVisible: true, updatedAt: "2026-06-30" }
  ],
  knowledge: [
    { id: "k1", title: "Как запускать новый клиентский проект", category: "process", body: "Стартуем с контекста, доступов, карты рисков и первого календаря.", archived: false },
    { id: "k2", title: "Тон Wemade в переписке", category: "culture", body: "Пишем ясно, тепло и по делу. Фиксируем договоренности после созвонов.", archived: false },
    { id: "k3", title: "Первые 7 дней новичка", category: "onboarding", body: "Познакомиться с командой, пройти базу знаний, взять первую простую задачу.", archived: false }
  ],
  events: [
    { id: "e1", projectId: "p1", title: "Статус-синк с клиентом", date: "2026-07-06", time: "11:00", visibility: "client" },
    { id: "e2", title: "Тихие часы команды", date: "2026-07-03", time: "13:00", visibility: "internal" },
    { id: "e3", projectId: "p2", title: "Редколлегия", date: "2026-07-08", time: "15:30", visibility: "all" }
  ],
  discussions: [
    { id: "m1", projectId: "p1", title: "Согласование визуала", lastMessage: "Клиент попросил второй вариант обложки", visibility: "client" },
    { id: "m2", projectId: "p3", title: "Риск по съемке", lastMessage: "Нужно решение до пятницы", visibility: "internal" }
  ],
  changes: [
    { id: "h1", entity: "Проект", action: "обновлен риск по съемке", actor: "Лена", at: "2026-07-02 12:20" },
    { id: "h2", entity: "Документ", action: "отправлен отчет на согласование", actor: "Марина", at: "2026-07-01 18:05" }
  ]
};
