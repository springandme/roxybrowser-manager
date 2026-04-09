import { useEffect, useMemo, useState } from "react";
import {
    Cloud,
    CloudUpload,
    FolderTree,
    RefreshCw,
    Save,
    X,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { WebDavSettings } from "../types/settings";
import { useStore } from "../stores/useStore";
import SyncHistoryModal from "./SyncHistoryModal";

interface WebDavModalProps {
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

export default function WebDavModal({ isOpen, onClose }: WebDavModalProps) {
    const { loadSyncStatus, syncStatus, isSyncing, syncToWebDav } = useStore();
    const [webdavSettings, setWebdavSettings] = useState<WebDavSettings>(defaultWebDavSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            void loadSettings();
        }
    }, [isOpen]);

    const feedbackTone = message
        ? "alert-success"
        : (syncStatus?.lastSyncStatus ?? webdavSettings.lastSyncStatus) === "error"
          ? "alert-error"
          : "alert-success";

    const statusMessage = useMemo(
        () => syncStatus?.lastSyncMessage ?? webdavSettings.lastSyncMessage,
        [syncStatus, webdavSettings.lastSyncMessage],
    );

    const updateWebDav = <K extends keyof WebDavSettings>(key: K, value: WebDavSettings[K]) => {
        setWebdavSettings((prev) => ({ ...prev, [key]: value }));
    };

    const loadSettings = async () => {
        setError("");
        setMessage("");
        try {
            const [savedWebDavSettings] = await Promise.all([
                invoke<WebDavSettings>("get_webdav_settings"),
                loadSyncStatus(),
            ]);
            setWebdavSettings({ ...defaultWebDavSettings, ...savedWebDavSettings });
        } catch (err) {
            setError(String(err));
        }
    };

    const persistSettings = async () => {
        const saved = await invoke<WebDavSettings>("save_webdav_settings", {
            settings: {
                enabled: webdavSettings.enabled,
                baseUrl: webdavSettings.baseUrl,
                username: webdavSettings.username,
                password: webdavSettings.password,
                remoteDir: webdavSettings.remoteDir,
                autoSyncEnabled: webdavSettings.autoSyncEnabled,
            },
        });
        setWebdavSettings((prev) => ({ ...prev, ...saved }));
        await loadSyncStatus();
        return saved;
    };

    const formatDateTime = (value: string | null) => {
        if (!value) return "---";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("zh-CN");
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            await persistSettings();
            setMessage("WebDAV 配置已保存");
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
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

    const ensureReadyForBackup = async () => {
        const saved = await persistSettings();
        if (!saved.enabled) {
            throw new Error("请先启用 WebDAV 备份");
        }
    };

    const handleBackup = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            await ensureReadyForBackup();
            const result = await syncToWebDav();
            setMessage(result.message);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenRestore = async () => {
        setIsLoading(true);
        setError("");
        setMessage("");
        try {
            await ensureReadyForBackup();
            setRestoreModalOpen(true);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const busy = isLoading || isSyncing;

    return (
        <>
            <div className="modal modal-open">
                <div className="modal-box max-w-2xl">
                    <button
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        onClick={onClose}
                        disabled={busy}
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <h3 className="font-bold text-lg mb-1">WebDAV 云备份</h3>
                    <p className="text-sm text-base-content/60 mb-5">
                        备份与恢复本地全部账号数据。
                    </p>

                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        {/* Feedback area - inside scroll */}
                        {error && (
                            <div className="alert alert-error py-2">
                                <span className="text-sm">{error}</span>
                            </div>
                        )}
                        {!error && (message || statusMessage) && (
                            <div className={`alert py-2 ${feedbackTone}`}>
                                <span className="text-sm">{message || statusMessage}</span>
                            </div>
                        )}

                        {/* --- Connection Config --- */}
                        <div className="card bg-base-200 border border-base-300">
                            <div className="card-body p-4 gap-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                                        <Cloud className="w-4 h-4 text-primary" />
                                        连接配置
                                    </h4>
                                    <label className="label cursor-pointer gap-2 p-0">
                                        <span className="label-text text-sm">启用</span>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary toggle-sm"
                                            checked={webdavSettings.enabled}
                                            onChange={(e) => updateWebDav("enabled", e.target.checked)}
                                            disabled={busy}
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="form-control">
                                        <span className="label-text text-xs mb-1">WebDAV 地址</span>
                                        <input
                                            type="url"
                                            className="input input-bordered input-sm"
                                            value={webdavSettings.baseUrl}
                                            onChange={(e) => updateWebDav("baseUrl", e.target.value)}
                                            placeholder="https://dav.example.com/webdav"
                                            disabled={busy}
                                        />
                                    </label>
                                    <label className="form-control">
                                        <span className="label-text text-xs mb-1">远程路径</span>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm"
                                            value={webdavSettings.remoteDir}
                                            onChange={(e) => updateWebDav("remoteDir", e.target.value)}
                                            placeholder="roxybrowser-manager"
                                            disabled={busy}
                                        />
                                    </label>
                                    <label className="form-control">
                                        <span className="label-text text-xs mb-1">用户名</span>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm"
                                            value={webdavSettings.username}
                                            onChange={(e) => updateWebDav("username", e.target.value)}
                                            placeholder="用户名"
                                            disabled={busy}
                                        />
                                    </label>
                                    <label className="form-control">
                                        <span className="label-text text-xs mb-1">密码</span>
                                        <input
                                            type="password"
                                            className="input input-bordered input-sm"
                                            value={webdavSettings.password}
                                            onChange={(e) => updateWebDav("password", e.target.value)}
                                            placeholder="密码"
                                            disabled={busy}
                                        />
                                    </label>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        className="btn btn-outline btn-sm gap-1"
                                        onClick={handleTest}
                                        disabled={busy}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
                                        测试连接
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm gap-1"
                                        onClick={handleSave}
                                        disabled={busy}
                                    >
                                        {isLoading ? (
                                            <span className="loading loading-spinner loading-xs"></span>
                                        ) : (
                                            <Save className="w-3.5 h-3.5" />
                                        )}
                                        保存配置
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- Backup & Restore --- */}
                        <div className="card bg-base-200 border border-base-300">
                            <div className="card-body p-4 gap-3">
                                <h4 className="font-semibold flex items-center gap-2 text-sm">
                                    <FolderTree className="w-4 h-4 text-primary" />
                                    数据备份与恢复
                                </h4>

                                <div className="flex items-center justify-between rounded-box bg-base-100 px-3 py-2">
                                    <div>
                                        <div className="text-sm font-medium">关键操作自动备份</div>
                                        <div className="text-xs text-base-content/60">
                                            切换用户、添加用户、导入配置后自动上传备份
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary toggle-sm"
                                        checked={webdavSettings.autoSyncEnabled}
                                        onChange={(e) => updateWebDav("autoSyncEnabled", e.target.checked)}
                                        disabled={busy}
                                    />
                                </div>

                                <div className="text-xs text-base-content/60 flex items-center gap-4 px-1">
                                    <span>最近备份: {formatDateTime(syncStatus?.lastSyncAt ?? webdavSettings.lastSyncAt)}</span>
                                    <span className="text-base-content/30">|</span>
                                    <span>状态: {syncStatus?.lastSyncStatus ?? webdavSettings.lastSyncStatus ?? "idle"}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-primary btn-sm gap-1 flex-1"
                                        onClick={handleBackup}
                                        disabled={busy}
                                    >
                                        <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                                        备份到 WebDAV
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm gap-1 flex-1"
                                        onClick={handleOpenRestore}
                                        disabled={busy}
                                    >
                                        <FolderTree className="w-3.5 h-3.5" />
                                        从 WebDAV 恢复
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-action">
                        <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
                            关闭
                        </button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={onClose}></div>
            </div>

            <SyncHistoryModal isOpen={restoreModalOpen} onClose={() => setRestoreModalOpen(false)} />
        </>
    );
}
