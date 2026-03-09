import { useEffect, useState } from "react";
import {
    CheckCircle,
    Cloud,
    FolderOpen,
    Search,
    ShieldCheck,
    Trash2,
    X,
    XCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { WebDavSettings } from "../types/settings";
import { useStore } from "../stores/useStore";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const defaultWebDavSettings: WebDavSettings = {
    enabled: false,
    baseUrl: "",
    username: "",
    password: "",
    remoteDir: "roxybrowser-manager",
    autoSyncEnabled: true,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncMessage: null,
    lastSnapshotId: null,
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { loadSyncStatus, syncStatus, isSyncing } = useStore();
    const [currentPath, setCurrentPath] = useState("");
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [webdavSettings, setWebdavSettings] = useState<WebDavSettings>(defaultWebDavSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setError("");
        setMessage("");
        try {
            const [path, savedWebDavSettings] = await Promise.all([
                invoke<string | null>("get_roxy_exe_path"),
                invoke<WebDavSettings>("get_webdav_settings"),
            ]);

            if (path) {
                setCurrentPath(path);
                await validatePath(path);
            } else {
                setCurrentPath("");
                setIsValid(null);
            }

            setWebdavSettings({ ...defaultWebDavSettings, ...savedWebDavSettings });
            await loadSyncStatus();
        } catch (err) {
            setError(String(err));
        }
    };

    const validatePath = async (path: string) => {
        if (!path.trim()) {
            setIsValid(null);
            return;
        }

        try {
            const valid = await invoke<boolean>("validate_roxy_exe_path", { path });
            setIsValid(valid);
        } catch (err) {
            setIsValid(false);
            console.error("Validation error:", err);
        }
    };

    const updateWebDav = <K extends keyof WebDavSettings>(key: K, value: WebDavSettings[K]) => {
        setWebdavSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleBrowse = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            const selectedPath = await invoke<string | null>("browse_for_exe");
            if (selectedPath) {
                setCurrentPath(selectedPath);
                await validatePath(selectedPath);
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoDetect = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            const detectedPath = await invoke<string | null>("auto_detect_roxy_path");
            if (detectedPath) {
                setCurrentPath(detectedPath);
                setIsValid(true);
            } else {
                setError("未检测到 RoxyBrowser 安装路径，请手动选择");
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setCurrentPath("");
        setIsValid(null);
        setError("");
        setMessage("");
    };

    const handleTest = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            const result = await invoke<string>("test_webdav_connection", {
                settings: {
                    enabled: webdavSettings.enabled,
                    baseUrl: webdavSettings.baseUrl,
                    username: webdavSettings.username,
                    password: webdavSettings.password,
                    remoteDir: webdavSettings.remoteDir,
                    autoSyncEnabled: webdavSettings.autoSyncEnabled,
                },
            });
            setMessage(result);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (currentPath.trim() && !isValid) {
            setError("请选择有效的 RoxyBrowser 可执行文件");
            return;
        }

        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            if (!currentPath.trim()) {
                await invoke("clear_roxy_exe_path");
            } else {
                await invoke("set_roxy_exe_path", { path: currentPath });
            }

            await invoke<WebDavSettings>("save_webdav_settings", {
                settings: {
                    enabled: webdavSettings.enabled,
                    baseUrl: webdavSettings.baseUrl,
                    username: webdavSettings.username,
                    password: webdavSettings.password,
                    remoteDir: webdavSettings.remoteDir,
                    autoSyncEnabled: webdavSettings.autoSyncEnabled,
                },
            });

            await loadSyncStatus();
            onClose();
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

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

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    onClick={onClose}
                    disabled={isLoading || isSyncing}
                >
                    <X className="w-4 h-4" />
                </button>

                <h3 className="font-bold text-lg mb-5">⚙️ WebDAV 与 RoxyBrowser 设置</h3>

                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4 gap-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <h4 className="font-semibold">RoxyBrowser 可执行文件</h4>
                                    <p className="text-sm text-base-content/60 mt-1">
                                        不配置时仍会使用默认自动检测逻辑。
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isValid === true && <CheckCircle className="w-5 h-5 text-success" />}
                                    {isValid === false && <XCircle className="w-5 h-5 text-error" />}
                                </div>
                            </div>

                            <input
                                type="text"
                                className="input input-bordered w-full font-mono text-sm"
                                value={currentPath}
                                readOnly
                                placeholder="未配置（将使用自动检测）"
                            />

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    className="btn btn-primary gap-2"
                                    onClick={handleBrowse}
                                    disabled={isLoading || isSyncing}
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    浏览...
                                </button>
                                <button
                                    className="btn btn-secondary gap-2"
                                    onClick={handleAutoDetect}
                                    disabled={isLoading || isSyncing}
                                >
                                    <Search className="w-4 h-4" />
                                    自动检测
                                </button>
                                <button
                                    className="btn btn-ghost gap-2"
                                    onClick={handleClear}
                                    disabled={isLoading || isSyncing || !currentPath.trim()}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    清除
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4 gap-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-primary" />
                                        WebDAV 云同步
                                    </h4>
                                    <p className="text-sm text-base-content/60 mt-1">
                                        支持关键操作自动同步，并保留远端完整历史快照。
                                    </p>
                                </div>
                                <label className="label cursor-pointer gap-3">
                                    <span className="label-text">启用同步</span>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary"
                                        checked={webdavSettings.enabled}
                                        onChange={(e) => updateWebDav("enabled", e.target.checked)}
                                        disabled={isLoading || isSyncing}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="form-control">
                                    <span className="label-text mb-2">服务器地址</span>
                                    <input
                                        type="url"
                                        className="input input-bordered"
                                        value={webdavSettings.baseUrl}
                                        onChange={(e) => updateWebDav("baseUrl", e.target.value)}
                                        placeholder="https://dav.example.com/webdav"
                                        disabled={isLoading || isSyncing}
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-2">远端目录</span>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={webdavSettings.remoteDir}
                                        onChange={(e) => updateWebDav("remoteDir", e.target.value)}
                                        placeholder="roxybrowser-manager"
                                        disabled={isLoading || isSyncing}
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-2">用户名</span>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={webdavSettings.username}
                                        onChange={(e) => updateWebDav("username", e.target.value)}
                                        placeholder="WebDAV 用户名"
                                        disabled={isLoading || isSyncing}
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-2">密码 / App Password</span>
                                    <input
                                        type="password"
                                        className="input input-bordered"
                                        value={webdavSettings.password}
                                        onChange={(e) => updateWebDav("password", e.target.value)}
                                        placeholder="WebDAV 密码"
                                        disabled={isLoading || isSyncing}
                                    />
                                </label>
                            </div>

                            <div className="flex items-center justify-between gap-4 flex-wrap rounded-box bg-base-100 px-4 py-3">
                                <div>
                                    <div className="font-medium">关键操作自动同步</div>
                                    <div className="text-sm text-base-content/60">
                                        切换用户、完成新用户添加、导入配置成功后自动上传快照。
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={webdavSettings.autoSyncEnabled}
                                    onChange={(e) => updateWebDav("autoSyncEnabled", e.target.checked)}
                                    disabled={isLoading || isSyncing}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="badge badge-outline h-auto py-2 justify-start">
                                    最近同步: {formatDateTime(syncStatus?.lastSyncAt ?? webdavSettings.lastSyncAt)}
                                </div>
                                <div className="badge badge-outline h-auto py-2 justify-start">
                                    最近状态: {syncStatus?.lastSyncStatus ?? webdavSettings.lastSyncStatus ?? "idle"}
                                </div>
                                <div className="badge badge-outline h-auto py-2 justify-start">
                                    最近快照: {syncStatus?.lastSnapshotId ?? webdavSettings.lastSnapshotId ?? "无"}
                                </div>
                            </div>

                            <div className="alert alert-info">
                                <ShieldCheck className="w-5 h-5" />
                                <span>同步前会先把当前活动用户落盘，再上传 `config.json + profiles/` 的完整快照。</span>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    className="btn btn-outline gap-2"
                                    onClick={handleTest}
                                    disabled={isLoading || isSyncing}
                                >
                                    <Cloud className="w-4 h-4" />
                                    测试连接
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mt-4">
                        <span>{error}</span>
                    </div>
                )}

                {!error && message && (
                    <div className="alert alert-success mt-4">
                        <span>{message}</span>
                    </div>
                )}

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose} disabled={isLoading || isSyncing}>
                        取消
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isLoading || isSyncing || (!!currentPath && !isValid)}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                保存中...
                            </>
                        ) : (
                            "保存"
                        )}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
}
