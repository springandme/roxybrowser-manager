import {
    CloudDownload,
    CloudUpload,
    Download,
    FolderOpen,
    History,
    Moon,
    Play,
    Plus,
    RefreshCw,
    Settings,
    Square,
    Sun,
    Upload,
    User,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../stores/useStore";
import UserCard from "./UserCard";
import AddUserWizard from "./AddUserWizard";
import SettingsModal from "./SettingsModal";
import SyncHistoryModal from "./SyncHistoryModal";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const {
        users,
        currentUser,
        roxyStatus,
        isLoading,
        isSyncing,
        error,
        syncStatus,
        startRoxy,
        stopRoxy,
        refreshStatus,
        openWizard,
        wizardOpen,
        exportProfiles,
        importProfiles,
        settingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        syncToWebDav,
        pullLatestFromWebDav,
    } = useStore();
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const saved = localStorage.getItem("theme");
        return (saved as "light" | "dark") || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case "n":
                        e.preventDefault();
                        openWizard();
                        break;
                    case "r":
                        e.preventDefault();
                        refreshStatus();
                        break;
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [openWizard, refreshStatus]);

    const formatDateTime = (value: string | null) => {
        if (!value) {
            return "尚未同步";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString("zh-CN");
    };

    const closeDropdown = () => {
        (document.activeElement as HTMLElement | null)?.blur();
    };

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const handleExportWithDialog = async () => {
        try {
            const selectedPath = await invoke<string | null>("browse_for_folder", { title: "选择导出目录" });
            if (selectedPath) {
                const result = await exportProfiles(selectedPath);
                alert(result);
            }
        } catch (syncError) {
            alert(`导出失败: ${syncError}`);
        }
    };

    const handleImportWithDialog = async () => {
        try {
            const selectedPath = await invoke<string | null>("browse_for_folder", { title: "选择导入配置目录" });
            if (selectedPath) {
                const result = await importProfiles(selectedPath);
                alert(result);
            }
        } catch (syncError) {
            alert(`导入失败: ${syncError}`);
        }
    };

    const handleSyncNow = async () => {
        try {
            const result = await syncToWebDav();
            alert(result.message);
        } catch (syncError) {
            alert(`同步失败: ${syncError}`);
        }
    };

    const handlePullLatest = async () => {
        const confirmed = confirm("下载最新远端快照前，会先创建一份本地安全备份。确定继续吗？");
        if (!confirmed) {
            return;
        }

        try {
            const result = await pullLatestFromWebDav();
            alert(result.message);
        } catch (syncError) {
            alert(`下载失败: ${syncError}`);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-4xl">🦊</div>
                    <div>
                        <h1 className="text-2xl font-bold">RoxyBrowser Manager</h1>
                        <p className="text-base-content/60 text-sm">多账户快速切换工具</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={toggleTheme}
                        title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
                    >
                        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                            <Settings className="w-5 h-5" />
                        </div>
                        <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box z-50 w-64 p-2 shadow-lg">
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        openSettingsModal();
                                    }}
                                    className={isLoading || isSyncing ? "disabled" : ""}
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    WebDAV 与路径设置
                                </a>
                            </li>
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        handleSyncNow();
                                    }}
                                    className={isLoading || isSyncing ? "disabled" : ""}
                                >
                                    <CloudUpload className="w-4 h-4" />
                                    立即同步到云端
                                </a>
                            </li>
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        handlePullLatest();
                                    }}
                                    className={isLoading || isSyncing ? "disabled" : ""}
                                >
                                    <CloudDownload className="w-4 h-4" />
                                    从云端下载最新
                                </a>
                            </li>
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        setHistoryModalOpen(true);
                                    }}
                                    className={isLoading || isSyncing ? "disabled" : ""}
                                >
                                    <History className="w-4 h-4" />
                                    同步历史
                                </a>
                            </li>
                            <li>
                                <hr className="my-1 border-base-300" />
                            </li>
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        handleExportWithDialog();
                                    }}
                                    className={isLoading || isSyncing || users.length === 0 ? "disabled" : ""}
                                >
                                    <Download className="w-4 h-4" />
                                    导出配置
                                </a>
                            </li>
                            <li>
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeDropdown();
                                        handleImportWithDialog();
                                    }}
                                    className={isLoading || isSyncing ? "disabled" : ""}
                                >
                                    <Upload className="w-4 h-4" />
                                    导入配置
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

            <div className="grid gap-4 mb-6">
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className={`badge ${roxyStatus.isRunning ? "badge-success" : "badge-ghost"} gap-2`}>
                                    <span className={`w-2 h-2 rounded-full ${roxyStatus.isRunning ? "bg-success animate-pulse" : "bg-base-content/30"}`} />
                                    {roxyStatus.isRunning ? "RoxyBrowser 运行中" : "RoxyBrowser 已停止"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-ghost btn-sm gap-1"
                                    onClick={refreshStatus}
                                    disabled={isLoading || isSyncing}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                                    刷新
                                </button>
                                <button
                                    className="btn btn-primary btn-sm gap-1"
                                    onClick={openWizard}
                                    disabled={isLoading || isSyncing}
                                >
                                    <Plus className="w-4 h-4" />
                                    添加用户
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body p-4 gap-3">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <div className="font-semibold flex items-center gap-2">
                                    <CloudUpload className="w-4 h-4 text-primary" />
                                    WebDAV 同步
                                </div>
                                <div className="text-sm text-base-content/60 mt-1">
                                    {syncStatus?.enabled ? "已启用" : "未启用"}
                                    {syncStatus?.enabled && syncStatus.autoSyncEnabled ? " · 关键操作自动同步" : ""}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-outline btn-sm gap-2"
                                    onClick={handleSyncNow}
                                    disabled={isLoading || isSyncing}
                                >
                                    <CloudUpload className={`w-4 h-4 ${isSyncing ? "animate-pulse" : ""}`} />
                                    立即同步
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm gap-2"
                                    onClick={() => setHistoryModalOpen(true)}
                                    disabled={isLoading || isSyncing}
                                >
                                    <History className="w-4 h-4" />
                                    历史
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="badge badge-outline h-auto py-2 justify-start">
                                最近同步: {formatDateTime(syncStatus?.lastSyncAt ?? null)}
                            </div>
                            <div className="badge badge-outline h-auto py-2 justify-start">
                                最近状态: {syncStatus?.lastSyncStatus ?? "idle"}
                            </div>
                            <div className="badge badge-outline h-auto py-2 justify-start">
                                最近快照: {syncStatus?.lastSnapshotId ?? "无"}
                            </div>
                        </div>

                        {syncStatus?.lastSyncMessage && (
                            <div className={`alert ${syncStatus.lastSyncStatus === "error" ? "alert-error" : "alert-info"}`}>
                                <span>{syncStatus.lastSyncMessage}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {users.length === 0 ? (
                    <div className="card bg-base-100 shadow">
                        <div className="card-body items-center text-center py-8">
                            <User className="w-12 h-12 text-base-content/30" />
                            <p className="text-base-content/60">暂无用户</p>
                            <p className="text-sm text-base-content/40">点击上方“添加用户”按钮添加第一个用户</p>
                        </div>
                    </div>
                ) : (
                    users.map((user) => (
                        <UserCard
                            key={user.email}
                            user={user}
                            isActive={user.email === currentUser}
                        />
                    ))
                )}
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    className="btn btn-success flex-1 gap-2"
                    onClick={startRoxy}
                    disabled={isLoading || isSyncing || roxyStatus.isRunning}
                >
                    <Play className="w-4 h-4" />
                    启动
                </button>
                <button
                    className="btn btn-error flex-1 gap-2"
                    onClick={stopRoxy}
                    disabled={isLoading || isSyncing || !roxyStatus.isRunning}
                >
                    <Square className="w-4 h-4" />
                    停止
                </button>
            </div>

            <div className="mt-4 text-center text-xs text-base-content/40">
                快捷键: ⌘N 添加用户 | ⌘R 刷新状态
            </div>

            {wizardOpen && <AddUserWizard />}
            <SettingsModal isOpen={settingsModalOpen} onClose={closeSettingsModal} />
            <SyncHistoryModal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} />
        </div>
    );
}
