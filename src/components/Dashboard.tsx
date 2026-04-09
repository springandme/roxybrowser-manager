import { Cloud, Download, FolderOpen, Moon, Play, Plus, RefreshCw, Settings, Square, Sun, Upload, User } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../stores/useStore";
import UserCard from "./UserCard";
import AddUserWizard from "./AddUserWizard";
import SettingsModal from "./SettingsModal";
import WebDavModal from "./WebDavModal";
import Toast from "./Toast";
import { useEffect, useRef, useState } from "react";

export default function Dashboard() {
    const {
        users,
        currentUser,
        roxyStatus,
        isLoading,
        isSyncing,
        error,
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
        addToast,
    } = useStore();
    const [webDavModalOpen, setWebDavModalOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        const saved = localStorage.getItem("theme");
        return (saved as "light" | "dark") || "dark";
    });
    const dropdownRef = useRef<HTMLDetailsElement>(null);

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

    const closeDropdown = () => {
        if (dropdownRef.current) {
            dropdownRef.current.open = false;
        }
    };

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const handleExportWithDialog = async () => {
        closeDropdown();
        try {
            const selectedPath = await invoke<string | null>("browse_for_folder", { title: "选择导出目录" });
            if (selectedPath) {
                const result = await exportProfiles(selectedPath);
                addToast("success", result);
            }
        } catch (exportError) {
            addToast("error", `导出失败: ${exportError}`);
        }
    };

    const handleImportWithDialog = async () => {
        closeDropdown();
        try {
            const selectedPath = await invoke<string | null>("browse_for_folder", { title: "选择导入配置目录" });
            if (selectedPath) {
                const result = await importProfiles(selectedPath);
                addToast("success", result);
            }
        } catch (importError) {
            addToast("error", `导入失败: ${importError}`);
        }
    };

    const busy = isLoading || isSyncing;

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
                    <details ref={dropdownRef} className="dropdown dropdown-end">
                        <summary className="btn btn-ghost btn-sm">
                            <Settings className="w-5 h-5" />
                        </summary>
                        <ul className="dropdown-content menu bg-base-200 rounded-box z-50 w-64 p-2 shadow-lg">
                            <li>
                                <button
                                    onClick={() => {
                                        closeDropdown();
                                        openSettingsModal();
                                    }}
                                    disabled={busy}
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    配置 RoxyBrowser 路径
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        closeDropdown();
                                        setWebDavModalOpen(true);
                                    }}
                                    disabled={busy}
                                >
                                    <Cloud className="w-4 h-4" />
                                    WebDAV 云备份
                                </button>
                            </li>
                            <li></li>
                            <li>
                                <button
                                    onClick={handleExportWithDialog}
                                    disabled={busy || users.length === 0}
                                >
                                    <Download className="w-4 h-4" />
                                    导出配置
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={handleImportWithDialog}
                                    disabled={busy}
                                >
                                    <Upload className="w-4 h-4" />
                                    导入配置
                                </button>
                            </li>
                        </ul>
                    </details>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

            <div className="card bg-base-100 shadow-lg mb-6">
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
                                disabled={busy}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                                刷新
                            </button>
                            <button
                                className="btn btn-primary btn-sm gap-1"
                                onClick={openWizard}
                                disabled={busy}
                            >
                                <Plus className="w-4 h-4" />
                                添加用户
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {users.length === 0 ? (
                    <div className="card bg-base-100 shadow">
                        <div className="card-body items-center text-center py-8">
                            <User className="w-12 h-12 text-base-content/30" />
                            <p className="text-base-content/60">暂无用户</p>
                            <p className="text-sm text-base-content/40">点击上方"添加用户"按钮添加第一个用户</p>
                        </div>
                    </div>
                ) : (
                    users.map((user) => (
                        <UserCard key={user.email} user={user} isActive={user.email === currentUser} />
                    ))
                )}
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    className="btn btn-success flex-1 gap-2"
                    onClick={startRoxy}
                    disabled={busy || roxyStatus.isRunning}
                >
                    <Play className="w-4 h-4" />
                    启动
                </button>
                <button
                    className="btn btn-error flex-1 gap-2"
                    onClick={stopRoxy}
                    disabled={busy || !roxyStatus.isRunning}
                >
                    <Square className="w-4 h-4" />
                    停止
                </button>
            </div>

            <div className="mt-4 text-center text-xs text-base-content/40">
                快捷键: Ctrl+N 添加用户 | Ctrl+R 刷新状态
            </div>

            {wizardOpen && <AddUserWizard />}
            <SettingsModal isOpen={settingsModalOpen} onClose={closeSettingsModal} />
            <WebDavModal isOpen={webDavModalOpen} onClose={() => setWebDavModalOpen(false)} />
            <Toast />
        </div>
    );
}
