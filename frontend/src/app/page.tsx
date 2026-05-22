"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "./utils/client";
import AuthComponent from "./components/auth";
import {
  Plus,
  Trash,
  Check,
  Calendar,
  Folder,
  BarChart,
  CreditCard,
  LogOut,
  Star,
  Search,
  ListTodo,
  AlertCircle,
  CheckCircle,
  Loader
} from "./components/Icons";

// Define TypeScript interfaces matching backend models
interface Project {
  id: number;
  name: string;
  color: string;
  user_id: number;
  created_at: string;
}

interface Todo {
  id: number;
  title: string;
  description?: string;
  priority: string; // low, medium, high
  due_date?: string;
  project_id?: number;
  user_id: number;
  is_completed: boolean;
  created_at: string;
  project?: Project;
}

interface User {
  id: number;
  email: string;
  full_name?: string;
  is_premium: boolean;
  created_at: string;
}

export default function Home() {
  // Authentication & User State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authVisible, setAuthVisible] = useState(false);

  // Active View in Dashboard
  const [activeTab, setActiveTab] = useState<"tasks" | "projects" | "analytics" | "billing">("tasks");

  // Core Data
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form State - Task Creation
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskProject, setNewTaskProject] = useState<string>("");

  // Form State - Project Creation
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#3B82F6"); // Default blue

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "due">("date");

  // Notification States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check URL parameters for billing callbacks (simulation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      }

      // Check URL query parameters
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        setSuccessMsg("Subscribed successfully! Welcome to Premium Tier.");
        // Clear query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Fetch profile when token updates
  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchDashboardData();
    } else {
      setUser(null);
      setTodos([]);
      setProjects([]);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const profile = await apiFetch<User>("/auth/me");
      setUser(profile);
    } catch (err: any) {
      handleLogout();
    }
  };

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const [todosList, projectsList] = await Promise.all([
        apiFetch<Todo[]>("/todos"),
        apiFetch<Project[]>("/projects")
      ]);
      setTodos(todosList);
      setProjects(projectsList);
    } catch (err: any) {
      showError(err.message || "Failed to load dashboard data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setAuthVisible(false);
    setSuccessMsg("Welcome back!");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setActiveTab("tasks");
    setSuccessMsg("Logged out successfully.");
  };

  // Helper Alerts
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // --- CRUD Operations ---

  // Create Todo Task
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setActionLoading(true);
    try {
      const todoIn = {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        priority: newTaskPriority,
        due_date: newTaskDueDate || undefined,
        project_id: newTaskProject ? parseInt(newTaskProject) : undefined
      };

      const created = await apiFetch<Todo>("/todos", {
        method: "POST",
        body: todoIn
      });

      setTodos([created, ...todos]);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("medium");
      setNewTaskDueDate("");
      setNewTaskProject("");
      showSuccess("Task added successfully!");
    } catch (err: any) {
      showError(err.message || "Could not add task. Upgrading your tier may help.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Todo Completion Status
  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updated = await apiFetch<Todo>(`/todos/${todo.id}`, {
        method: "PUT",
        body: { is_completed: !todo.is_completed }
      });
      setTodos(todos.map(t => t.id === todo.id ? updated : t));
    } catch (err: any) {
      showError(err.message || "Failed to update task");
    }
  };

  // Delete Todo Task
  const handleDeleteTodo = async (id: number) => {
    try {
      await apiFetch(`/todos/${id}`, { method: "DELETE" });
      setTodos(todos.filter(t => t.id !== id));
      showSuccess("Task deleted.");
    } catch (err: any) {
      showError(err.message || "Failed to delete task");
    }
  };

  // Create Project Folder
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setActionLoading(true);
    try {
      const created = await apiFetch<Project>("/projects", {
        method: "POST",
        body: { name: newProjectName, color: newProjectColor }
      });
      setProjects([...projects, created]);
      setNewProjectName("");
      setNewProjectColor("#3B82F6");
      showSuccess(`Project "${created.name}" created!`);
    } catch (err: any) {
      showError(err.message || "Folder limit reached. Upgrade to premium.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Project Folder
  const handleDeleteProject = async (id: number) => {
    if (!confirm("Deleting a folder deletes all of its tasks. Do you want to proceed?")) return;
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      setProjects(projects.filter(p => p.id !== id));
      // Filter out deleted todos locally
      setTodos(todos.filter(t => t.project_id !== id));
      showSuccess("Folder deleted.");
    } catch (err: any) {
      showError(err.message || "Failed to delete folder");
    }
  };

  // Upgrade Plan Simulation
  const handleUpgradeAccount = async () => {
    setActionLoading(true);
    try {
      const result = await apiFetch("/billing/mock-upgrade", { method: "POST" });
      if (user) {
        setUser({ ...user, is_premium: true });
      }
      showSuccess(result.message || "Upgraded successfully!");
      setActiveTab("tasks");
    } catch (err: any) {
      showError(err.message || "Upgrade failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Downgrade Plan Simulation
  const handleDowngradeAccount = async () => {
    setActionLoading(true);
    try {
      const result = await apiFetch("/billing/mock-downgrade", { method: "POST" });
      if (user) {
        setUser({ ...user, is_premium: false });
      }
      showSuccess(result.message || "Downgraded successfully.");
      setActiveTab("tasks");
      fetchDashboardData(); // Refetch to clean up limits if needed
    } catch (err: any) {
      showError(err.message || "Downgrade failed");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Filtering & Sorting Operations ---
  const getFilteredTodos = () => {
    let result = [...todos];

    // Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Status Filter
    if (statusFilter === "pending") {
      result = result.filter(t => !t.is_completed);
    } else if (statusFilter === "completed") {
      result = result.filter(t => t.is_completed);
    }

    // Project Folder Filter
    if (projectFilter !== "all") {
      if (projectFilter === "none") {
        result = result.filter(t => !t.project_id);
      } else {
        result = result.filter(t => t.project_id === parseInt(projectFilter));
      }
    }

    // Sort operations
    if (sortBy === "date") {
      // Newest created first
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "priority") {
      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      result.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
    } else if (sortBy === "due") {
      result.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    }

    return result;
  };

  const filteredTodos = getFilteredTodos();

  // --- Analytics Computations ---
  const totalTodosCount = todos.length;
  const completedTodosCount = todos.filter(t => t.is_completed).length;
  const pendingTodosCount = totalTodosCount - completedTodosCount;
  const completionRate = totalTodosCount > 0 ? Math.round((completedTodosCount / totalTodosCount) * 100) : 0;

  // Priority count breakdown
  const highPriorityCount = todos.filter(t => t.priority === "high").length;
  const mediumPriorityCount = todos.filter(t => t.priority === "medium").length;
  const lowPriorityCount = todos.filter(t => t.priority === "low").length;

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-white selection:text-black">
      {/* Dynamic Success/Error Banners */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle size={20} className="shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {!token ? (
        // ================= MARKETING LANDING PAGE =================
        <div className="relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[150px]" />

          {/* Navigation Bar */}
          <header className="mx-auto flex max-w-7xl items-center justify-between py-6 px-8 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <ListTodo size={22} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">TodoSaaS</span>
            </div>
            <button
              onClick={() => setAuthVisible(true)}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Sign In
            </button>
          </header>

          {/* Hero Section */}
          <section className="mx-auto max-w-5xl px-8 py-24 text-center sm:py-32">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300">
              <Star size={14} className="text-yellow-400" />
              <span>Free 15-task trial. No credit card required.</span>
            </div>
            <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-white sm:text-7xl leading-tight">
              Organize your tasks. <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Accelerate your day.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              A minimalist, blazing-fast task management workstation. Categorize with custom folders, filter by priority, and monitor with premium analytics.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <button
                onClick={() => setAuthVisible(true)}
                className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform hover:scale-105"
              >
                Get Started For Free
              </button>
            </div>
          </section>

          {/* Features Grid */}
          <section className="mx-auto max-w-6xl px-8 py-16 border-t border-white/5">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              Designed for Flow State
            </h2>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Folder size={24} />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Smart Folders</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">
                  Group tasks by custom folders with distinct colors. Maintain separation between Work, Life, and side projects.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <BarChart size={24} />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Visual Analytics</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">
                  Analyze your output with priority distribution, daily completions, and total progress tracking charts.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Star size={24} />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">SaaS Premium</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">
                  Upgrade instantly to access unlimited active tasks, custom folders, and full analytics dashboards.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing Plans */}
          <section className="mx-auto max-w-4xl px-8 py-20 border-t border-white/5 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">Simple, Transparent Pricing</h2>
            <p className="mt-3 text-zinc-400">Find the tier that matches your workflow</p>

            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {/* Free Plan */}
              <div className="rounded-3xl border border-white/5 bg-zinc-900/30 p-8 text-left">
                <h3 className="text-xl font-bold text-zinc-300">Basic Tier</h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-4xl font-extrabold tracking-tight">$0</span>
                  <span className="ml-1 text-zinc-500">/ forever</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">Perfect for keeping track of your immediate objectives.</p>
                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Up to 15 active tasks</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Up to 3 project folders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Standard search & filters</span>
                  </li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="relative rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-zinc-900/60 p-8 text-left shadow-2xl">
                <div className="absolute top-4 right-4 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  Popular
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Premium Tier <Star size={16} className="text-yellow-400 fill-yellow-400" />
                </h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-4xl font-extrabold tracking-tight">$9.99</span>
                  <span className="ml-1 text-zinc-500">/ month</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">For power users who need complete organization & charts.</p>
                <ul className="mt-8 space-y-4 text-sm text-zinc-200">
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Unlimited active tasks</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Unlimited project folders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Interactive visual analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-blue-400" />
                    <span>Priority dashboard sorting</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-white/5 text-center text-sm text-zinc-600">
            &copy; 2026 TodoSaaS Inc. Designed for elite workflows.
          </footer>

          {/* Authentication Modal */}
          {authVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative">
                <button
                  onClick={() => setAuthVisible(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
                <AuthComponent onSuccess={handleLoginSuccess} />
              </div>
            </div>
          )}
        </div>
      ) : (
        // ================= APP WORKSPACE DASHBOARD =================
        <div className="flex min-h-screen bg-zinc-950">
          
          {/* Side Navigation Panel */}
          <aside className="w-64 border-r border-white/5 bg-zinc-900/20 px-6 py-8 flex flex-col justify-between shrink-0">
            <div>
              {/* Logo / Brand */}
              <div className="flex items-center gap-3 mb-10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                  <ListTodo size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">TodoSaaS</span>
              </div>

              {/* User Profile Summary */}
              {user && (
                <div className="mb-8 rounded-2xl border border-white/5 bg-zinc-900/40 p-4">
                  <div className="text-sm font-bold text-white max-w-full truncate">
                    {user.full_name || "Workspace User"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">{user.email}</div>
                  
                  {/* Account Badge */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {user.is_premium ? (
                      <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5">
                        <Star size={10} className="fill-current" /> Premium
                      </span>
                    ) : (
                      <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/30 rounded-full px-2 py-0.5">
                        Free Account
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    activeTab === "tasks"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <ListTodo size={18} />
                  <span>My Tasks</span>
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    activeTab === "projects"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Folder size={18} />
                  <span>Folders / Projects</span>
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    activeTab === "analytics"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <BarChart size={18} />
                  <span>Productivity Logs</span>
                </button>
                <button
                  onClick={() => setActiveTab("billing")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    activeTab === "billing"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <CreditCard size={18} />
                  <span>Subscription</span>
                </button>
              </nav>
            </div>

            {/* Logout Panel */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </aside>

          {/* Main Dashboard Panel */}
          <main className="flex-1 px-10 py-8 overflow-y-auto max-h-screen">
            
            {/* View 1: Tasks Management */}
            {activeTab === "tasks" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">My Tasks</h1>
                  <p className="text-sm text-zinc-500 mt-1">Add objectives, plan deadlines, and structure your workday.</p>
                </div>

                {/* Free Tier Tasks Count Indicator */}
                {user && !user.is_premium && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      Task Limit Meter: <strong className="text-white">{todos.filter(t => !t.is_completed).length} / 15</strong> active tasks used.
                    </span>
                    <button
                      onClick={() => setActiveTab("billing")}
                      className="text-xs font-semibold text-blue-400 hover:underline"
                    >
                      Unlock unlimited tasks &rarr;
                    </button>
                  </div>
                )}

                {/* Adding Task Section */}
                <form onSubmit={handleCreateTodo} className="rounded-2xl border border-white/5 bg-zinc-900/20 p-5 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      type="text"
                      required
                      placeholder="What needs to be done?"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700"
                    />
                    
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-700"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>

                    <select
                      value={newTaskProject}
                      onChange={(e) => setNewTaskProject(e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-700"
                    >
                      <option value="">No Folder</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-700"
                    />

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                    >
                      {actionLoading ? <Loader size={16} /> : <Plus size={16} />}
                      <span>Add Task</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Task details or description (optional)..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-xs text-zinc-400 placeholder-zinc-700 outline-none focus:border-zinc-700"
                  />
                </form>

                {/* Filter and sorting options */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-white/5">
                  <div className="relative flex-1 max-w-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-zinc-900 bg-zinc-950/40 py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-800"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {/* Status filter selection */}
                    <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-900">
                      {(["all", "pending", "completed"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`rounded px-2.5 py-1 uppercase tracking-wider text-[10px] font-bold transition-all ${
                            statusFilter === status ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    {/* Folder Filter Selection */}
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="rounded-lg border border-zinc-900 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-400 outline-none"
                    >
                      <option value="all">All Folders</option>
                      <option value="none">No Folder</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {/* Sort selector */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="rounded-lg border border-zinc-900 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-400 outline-none"
                    >
                      <option value="date">Date Added</option>
                      <option value="priority">Priority Sorted</option>
                      <option value="due">Due Date</option>
                    </select>
                  </div>
                </div>

                {/* Render Todo List */}
                {loadingData ? (
                  <div className="py-20 flex justify-center items-center text-zinc-500">
                    <Loader size={28} className="text-zinc-600" />
                  </div>
                ) : filteredTodos.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-900 text-zinc-600">
                    <ListTodo size={36} className="mx-auto text-zinc-700 mb-3" />
                    <span>No tasks found matching your active filters.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-start justify-between rounded-xl border p-4 transition-all duration-200 ${
                          todo.is_completed
                            ? "bg-zinc-900/10 border-zinc-950 text-zinc-600 opacity-60"
                            : "bg-zinc-900/30 border-white/5 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-start gap-4 pr-4">
                          {/* Circle Checkbox */}
                          <button
                            onClick={() => handleToggleTodo(todo)}
                            className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                              todo.is_completed
                                ? "bg-emerald-500 border-emerald-500 text-black scale-105"
                                : "border-zinc-700 hover:border-zinc-400"
                            }`}
                          >
                            {todo.is_completed && <Check size={12} className="text-zinc-950" />}
                          </button>

                          <div>
                            {/* Title & priority pill */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-semibold text-sm ${todo.is_completed ? "line-through" : "text-zinc-200"}`}>
                                {todo.title}
                              </span>
                              
                              {/* Priority Badge */}
                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider border ${
                                  todo.priority === "high"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : todo.priority === "medium"
                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                }`}
                              >
                                {todo.priority}
                              </span>

                              {/* Folder/Project Tag */}
                              {todo.project && (
                                <span
                                  style={{
                                    backgroundColor: `${todo.project.color}15`,
                                    color: todo.project.color,
                                    borderColor: `${todo.project.color}30`
                                  }}
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                                >
                                  {todo.project.name}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {todo.description && (
                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-xl">
                                {todo.description}
                              </p>
                            )}

                            {/* Due Date Indicator */}
                            {todo.due_date && (
                              <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-2 font-medium">
                                <Calendar size={10} />
                                <span>Due: {todo.due_date}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Panel */}
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                          title="Delete task"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View 2: Folders / Project Directories */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Folders & Projects</h1>
                  <p className="text-sm text-zinc-500 mt-1">Isolate your life and workspaces. Block clutter.</p>
                </div>

                {/* Free Tier Project Limit warning */}
                {user && !user.is_premium && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      Folder Limit: <strong className="text-white">{projects.length} / 3</strong> created.
                    </span>
                    {projects.length >= 3 && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertCircle size={12} /> Limit reached
                      </span>
                    )}
                  </div>
                )}

                {/* Project Directory creation form */}
                <form onSubmit={handleCreateProject} className="rounded-2xl border border-white/5 bg-zinc-900/20 p-5 space-y-4 max-w-xl">
                  <h3 className="text-sm font-bold text-white">Create New Folder</h3>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      required
                      placeholder="Folder name (e.g. Work, Gym)"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-700"
                    />
                    
                    {/* Color selection dropdown/grid */}
                    <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1">
                      <span className="text-xs text-zinc-500">Color:</span>
                      <div className="flex gap-1.5">
                        {(["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"]).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewProjectColor(color)}
                            style={{ backgroundColor: color }}
                            className={`h-4.5 w-4.5 rounded-full border transition-transform ${
                              newProjectColor === color ? "scale-120 border-white" : "border-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading ? <Loader size={16} /> : <Plus size={16} />}
                      <span>Create</span>
                    </button>
                  </div>
                </form>

                {/* Folders List grid */}
                {projects.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-900 text-zinc-600">
                    <Folder size={36} className="mx-auto text-zinc-700 mb-3" />
                    <span>No project folders created yet.</span>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-w-4xl">
                    {projects.map((proj) => {
                      const count = todos.filter(t => t.project_id === proj.id).length;
                      return (
                        <div
                          key={proj.id}
                          className="rounded-2xl border border-white/5 bg-zinc-900/30 p-5 flex flex-col justify-between hover:border-zinc-800 transition-all group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                style={{ backgroundColor: proj.color }}
                                className="h-4 w-4 rounded-full border border-white/20"
                              />
                              <span className="font-bold text-white">{proj.name}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete folder"
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                          
                          <div className="mt-8 flex items-baseline justify-between">
                            <span className="text-xs text-zinc-500">Task load</span>
                            <span className="text-sm font-extrabold text-zinc-300">
                              {count} {count === 1 ? "task" : "tasks"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View 3: Productivity Logs / Analytics dashboard */}
            {activeTab === "analytics" && (
              <div className="space-y-6 relative min-h-[400px]">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Productivity Analytics</h1>
                  <p className="text-sm text-zinc-500 mt-1">Quantify your efficiency. Study your habits.</p>
                </div>

                {user && !user.is_premium ? (
                  // Locked blur view for Free Account
                  <div className="relative mt-8">
                    {/* Blurry Background Mock Dashboard */}
                    <div className="grid gap-6 sm:grid-cols-3 opacity-20 blur-sm pointer-events-none select-none">
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
                        <span className="text-xs text-zinc-500">Progress</span>
                        <div className="text-3xl font-extrabold mt-2 text-white">76%</div>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
                        <span className="text-xs text-zinc-500">Completed</span>
                        <div className="text-3xl font-extrabold mt-2 text-white">42</div>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
                        <span className="text-xs text-zinc-500">High priority load</span>
                        <div className="text-3xl font-extrabold mt-2 text-white">12</div>
                      </div>
                    </div>

                    {/* Lock Screen Centered Card */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/60 rounded-3xl border border-zinc-900">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400 mb-4 border border-yellow-500/20">
                        <Star size={28} className="fill-current" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Unlock Professional Insights</h3>
                      <p className="mt-2 max-w-sm text-sm text-zinc-400 leading-relaxed">
                        Visualize priority breakdowns, completion frequencies, and category ratios to structure your schedule.
                      </p>
                      <button
                        onClick={() => setActiveTab("billing")}
                        className="mt-6 rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                ) : (
                  // Premium Analytics View
                  <div className="space-y-6">
                    {/* Metric Cards Row */}
                    <div className="grid gap-5 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Completion rate</span>
                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold text-white">{completionRate}%</span>
                        </div>
                        <div className="mt-3 w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                          <div style={{ width: `${completionRate}%` }} className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total tasks logged</span>
                        <div className="mt-4 text-4xl font-extrabold text-white">{totalTodosCount}</div>
                        <span className="text-[10px] text-zinc-500 mt-2">Inclusive of deleted/archived</span>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Completed tasks</span>
                        <div className="mt-4 text-4xl font-extrabold text-emerald-400">{completedTodosCount}</div>
                        <span className="text-[10px] text-zinc-500 mt-2">Actions cleared successfully</span>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending tasks</span>
                        <div className="mt-4 text-4xl font-extrabold text-yellow-500">{pendingTodosCount}</div>
                        <span className="text-[10px] text-zinc-500 mt-2">Pending workload</span>
                      </div>
                    </div>

                    {/* Chart Dashboard Panels */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Custom SVG Donut Chart */}
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider text-zinc-400">Task Priorities</h3>
                        
                        {totalTodosCount === 0 ? (
                          <div className="h-48 flex items-center justify-center text-zinc-600 text-xs">
                            Create tasks to compile data.
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-48">
                            {/* Donut SVG */}
                            <div className="relative h-32 w-32 shrink-0">
                              <svg className="h-full w-full" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#18181b" strokeWidth="3" />
                                
                                {/* Construct segments based on counts */}
                                {(() => {
                                  const total = highPriorityCount + mediumPriorityCount + lowPriorityCount || 1;
                                  const p1 = (highPriorityCount / total) * 100;
                                  const p2 = (mediumPriorityCount / total) * 100;
                                  const p3 = (lowPriorityCount / total) * 100;

                                  // Dash arrays: slice sizes & offsets
                                  const dash1 = `${p1} ${100 - p1}`;
                                  const dash2 = `${p2} ${100 - p2}`;
                                  const dash3 = `${p3} ${100 - p3}`;

                                  const offset1 = 100 - p1 + 25; // start offset
                                  const offset2 = 100 - p1 - p2 + 25;
                                  const offset3 = 100 - p1 - p2 - p3 + 25;

                                  return (
                                    <>
                                      {highPriorityCount > 0 && (
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray={dash1} strokeDashoffset={offset1} />
                                      )}
                                      {mediumPriorityCount > 0 && (
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray={dash2} strokeDashoffset={offset2} />
                                      )}
                                      {lowPriorityCount > 0 && (
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray={dash3} strokeDashoffset={offset3} />
                                      )}
                                    </>
                                  );
                                })()}
                              </svg>
                              
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Priority</span>
                                <span className="text-lg font-bold text-white">Load</span>
                              </div>
                            </div>

                            {/* Legends */}
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-red-500 inline-block" />
                                <span className="text-zinc-400">High: <strong className="text-white">{highPriorityCount}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-yellow-500 inline-block" />
                                <span className="text-zinc-400">Medium: <strong className="text-white">{mediumPriorityCount}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-blue-500 inline-block" />
                                <span className="text-zinc-400">Low: <strong className="text-white">{lowPriorityCount}</strong></span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Productivity Graph mock using styled SVG elements */}
                      <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider text-zinc-400">Weekly completions</h3>
                        
                        <div className="flex items-end justify-between h-40 pt-4 px-2">
                          {/* Generate dummy chart bars representing week days completions */}
                          {[
                            { day: "Mon", count: Math.min(completedTodosCount, 2) },
                            { day: "Tue", count: Math.min(completedTodosCount + 1, 4) },
                            { day: "Wed", count: Math.min(completedTodosCount, 3) },
                            { day: "Thu", count: Math.max(completedTodosCount - 1, 1) },
                            { day: "Fri", count: completedTodosCount },
                            { day: "Sat", count: 0 },
                            { day: "Sun", count: 1 }
                          ].map((item, index) => {
                            const barHeightPercent = Math.min((item.count / 5) * 100, 100) || 5;
                            return (
                              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                <span className="text-[10px] font-bold text-zinc-500">{item.count}</span>
                                <div className="w-6 bg-zinc-950 rounded-md overflow-hidden h-24 flex items-end">
                                  <div
                                    style={{ height: `${barHeightPercent}%` }}
                                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-b-md"
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-zinc-500">{item.day}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View 4: Subscription & Billing Management */}
            {activeTab === "billing" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Subscription & Billing</h1>
                  <p className="text-sm text-zinc-500 mt-1">Manage plans, examine premium capability parameters.</p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-zinc-900/30 p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">Current Account Status</h3>
                      <p className="text-zinc-500 text-sm mt-1">Based on database tier attributes</p>
                    </div>
                    <div>
                      {user?.is_premium ? (
                        <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          <Star size={12} className="fill-current" /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-zinc-800 border border-zinc-700/30 text-zinc-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Free Basic
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6 space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Upgrade to unlock unlimited task management slots, unlimited categories/folders, priority dashboard sorting filters, and visual productivity analytics.
                    </p>

                    {user?.is_premium ? (
                      <div className="space-y-4">
                        <div className="text-xs text-zinc-500">
                          Since this is a sandboxed system with mock Stripe settings, you can downgrade back to a basic account to test limits anytime.
                        </div>
                        <button
                          onClick={handleDowngradeAccount}
                          disabled={actionLoading}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader size={16} /> : null}
                          <span>Mock Downgrade to Free Tier</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-xs text-zinc-500">
                          Simulate Stripe payment fulfillment to unlock features immediately without actual payment processing.
                        </div>
                        <button
                          onClick={handleUpgradeAccount}
                          disabled={actionLoading}
                          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          {actionLoading ? <Loader size={16} className="text-black" /> : <Star size={16} className="fill-black text-black" />}
                          <span>Simulate Mock Upgrade ($9.99/mo)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
