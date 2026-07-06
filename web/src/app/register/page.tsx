"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Clock,
  LoaderCircle,
  Percent,
  Play,
  RotateCcw,
  Square,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchRegisterConfig,
  startRegister,
  stopRegister,
  resetRegister,
  updateRegisterConfig,
  subscribeRegisterEvents,
  type RegisterConfig,
  type RegisterStats,
} from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const metricCards = [
  { key: "success" as const, label: "注册成功", color: "text-emerald-600", icon: CheckCircle2 },
  { key: "fail" as const, label: "注册失败", color: "text-rose-500", icon: CircleOff },
  { key: "done" as const, label: "已完成", color: "text-blue-500", icon: Users },
  { key: "running" as const, label: "进行中", color: "text-amber-500", icon: LoaderCircle },
  { key: "success_rate" as const, label: "成功率", color: "text-violet-500", icon: Percent },
  { key: "current_quota" as const, label: "当前额度", color: "text-stone-700", icon: Clock },
] as const;

const modeOptions = [
  { label: "总目标", value: "total" },
  { label: "可用目标", value: "available" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function LogEntry({ entry }: { entry: { time: string; text: string; level: string } }) {
  const levelColor = entry.level === "red" || entry.level === "error"
    ? "text-rose-400"
    : entry.level === "yellow" || entry.level === "warning"
      ? "text-amber-400"
      : entry.level === "green" || entry.level === "success"
        ? "text-emerald-400"
        : "text-stone-300";

  return (
    <div className="flex items-start gap-2 py-0.5 font-mono text-[13px] leading-6">
      <span className="shrink-0 text-stone-500">{formatTime(entry.time)}</span>
      <span className={cn("shrink-0", levelColor)}>◆</span>
      <span className="text-stone-200">{entry.text}</span>
    </div>
  );
}

function RegisterPageContent() {
  const didLoad = useRef(false);
  const [config, setConfig] = useState<RegisterConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [logs, setLogs] = useState<RegisterConfig["logs"]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [editingThreads, setEditingThreads] = useState("5");
  const [editingTotal, setEditingTotal] = useState("2000");
  const [editingMode, setEditingMode] = useState("total");
  const [editingProxy, setEditingProxy] = useState("");

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchRegisterConfig();
      setConfig(data.register);
      setLogs(data.register.logs);
      setEditingThreads(String(data.register.threads));
      setEditingTotal(String(data.register.total));
      setEditingMode(data.register.mode);
      setEditingProxy(data.register.proxy);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载注册配置失败";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    void loadConfig();
  }, [loadConfig]);

  // SSE updates
  useEffect(() => {
    const unsub = subscribeRegisterEvents((data) => {
      setConfig(data);
      setLogs((prev) => {
        const merged = [...prev, ...(data.logs || [])];
        // deduplicate by time+text
        const seen = new Set<string>();
        return merged.filter((l) => {
          const key = `${l.time}|${l.text}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    });
    return unsub;
  }, []);

  // auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = async () => {
    setIsToggling(true);
    try {
      const data = await startRegister();
      setConfig(data.register);
      setLogs(data.register.logs);
      toast.success("注册任务已启动");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启动失败");
    } finally {
      setIsToggling(false);
    }
  };

  const handleStop = async () => {
    setIsToggling(true);
    try {
      const data = await stopRegister();
      setConfig(data.register);
      setLogs(data.register.logs);
      toast.success("注册任务已停止");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "停止失败");
    } finally {
      setIsToggling(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const data = await resetRegister();
      setConfig(data.register);
      setLogs(data.register.logs);
      toast.success("统计数据已重置");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重置失败");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const data = await updateRegisterConfig({
        total: parseInt(editingTotal, 10) || 2000,
        threads: parseInt(editingThreads, 10) || 5,
        mode: editingMode,
        proxy: editingProxy,
      });
      setConfig(data.register);
      toast.success("配置已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存配置失败");
    }
  };

  const stats: RegisterStats | null = config?.stats ?? null;
  const isRunning = config?.enabled ?? false;

  if (isLoading || !config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">
            Account Registration
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">注册机</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-stone-200 bg-white/80 px-4 text-stone-700 hover:bg-white"
            onClick={() => void loadConfig()}
            disabled={isLoading}
          >
            <LoaderCircle className={cn("size-4", isLoading ? "animate-spin" : "")} />
            刷新
          </Button>
          {isRunning ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl border-rose-200 bg-rose-50/80 px-4 text-rose-600 hover:bg-rose-100"
              onClick={() => void handleStop()}
              disabled={isToggling}
            >
              {isToggling ? <LoaderCircle className="size-4 animate-spin" /> : <Square className="size-4" />}
              停止注册
            </Button>
          ) : (
            <Button
              className="h-10 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-500"
              onClick={() => void handleStart()}
              disabled={isToggling}
            >
              {isToggling ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
              开始注册
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 rounded-xl border-stone-200 bg-white/80 px-4 text-stone-700 hover:bg-white"
            onClick={() => void handleReset()}
            disabled={isResetting}
          >
            {isResetting ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            重置统计
          </Button>
        </div>
      </section>

      {/* 统计卡片 */}
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map((item) => {
          const Icon = item.icon;
          const rawValue = stats ? stats[item.key] : 0;
          const displayValue = item.key === "success_rate"
            ? `${(Number(rawValue) * 100).toFixed(1)}%`
            : formatCompact(Number(rawValue));
          return (
            <Card key={item.key} className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-xs font-medium text-stone-400">{item.label}</span>
                  <Icon className="size-4 text-stone-400" />
                </div>
                <div className={cn("text-[1.75rem] font-semibold tracking-tight", item.color)}>
                  {displayValue}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* 运行状态 */}
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-500">状态：</span>
              {isRunning ? (
                <Badge variant="success" className="inline-flex items-center gap-1 rounded-md px-2 py-1">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  运行中
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-md bg-stone-100 text-stone-700">
                  已停止
                </Badge>
              )}
            </div>
            {stats?.started_at && (
              <div className="flex items-center gap-2 text-stone-500">
                <Clock className="size-4" />
                开始时间：{formatTime(stats.started_at)}
              </div>
            )}
            {stats && stats.elapsed_seconds > 0 && (
              <div className="flex items-center gap-2 text-stone-500">
                <Clock className="size-4" />
                耗时：{formatDuration(stats.elapsed_seconds)}
                <span className="text-stone-400">
                  (平均 {stats.avg_seconds.toFixed(1)}s/个)
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-stone-500">
              <Users className="size-4" />
              可用号：{stats?.current_available ?? 0}
              <span className="text-stone-400">/ 额度：{stats?.current_quota ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配置 */}
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="p-4">
          <h2 className="mb-4 text-sm font-medium text-stone-700">配置</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">线程数</label>
              <Input
                value={editingThreads}
                onChange={(e) => setEditingThreads(e.target.value)}
                className="h-10 w-20 rounded-xl border-stone-200 bg-white text-center"
                type="number"
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">总目标</label>
              <Input
                value={editingTotal}
                onChange={(e) => setEditingTotal(e.target.value)}
                className="h-10 w-24 rounded-xl border-stone-200 bg-white text-center"
                type="number"
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500">模式</label>
              <Select value={editingMode} onValueChange={setEditingMode}>
                <SelectTrigger className="h-10 w-28 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[200px] flex-1">
              <label className="text-xs font-medium text-stone-500">代理</label>
              <Input
                value={editingProxy}
                onChange={(e) => setEditingProxy(e.target.value)}
                className="h-10 rounded-xl border-stone-200 bg-white font-mono text-xs"
                placeholder="http://mihomo-chatgpt2api:7890"
              />
            </div>
            <Button
              className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
              onClick={() => void handleSaveConfig()}
            >
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志 */}
      <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <div className="border-b border-stone-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">
              实时日志
              {isRunning && <LoaderCircle className="ml-2 inline size-3.5 animate-spin text-amber-500" />}
            </h2>
            <Badge variant="secondary" className="rounded-md bg-stone-100 text-stone-600 font-mono">
              {logs.length} 条
            </Badge>
          </div>
        </div>
        <CardContent className="p-0">
          {logs.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto bg-stone-950 px-4 py-3">
              {logs.map((entry, i) => (
                <LogEntry key={`${entry.time}-${entry.text}-${i}`} entry={entry} />
              ))}
              <div ref={logsEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <div className="rounded-xl bg-stone-100 p-3 text-stone-500">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-stone-700">暂无日志</p>
                <p className="text-sm text-stone-500">启动注册任务后日志将实时显示在此处。</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function RegisterPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);

  if (isCheckingAuth || !session || session.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return <RegisterPageContent />;
}
