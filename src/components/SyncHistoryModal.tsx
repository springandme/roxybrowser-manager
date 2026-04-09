import { useEffect, useState } from "react";
import { Clock3, Download, RefreshCw, RotateCcw, Server, Trash2, X } from "lucide-react";
import { useStore } from "../stores/useStore";

interface SyncHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SyncHistoryModal({ isOpen, onClose }: SyncHistoryModalProps) {
    const {
        isSyncing,
        snapshots,
        listWebDavSnapshots,
        restoreWebDavSnapshot,
        deleteWebDavSnapshot,
        syncStatus,
        addToast,
    } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmAction, setConfirmAction] = useState<{
        type: "restore" | "delete";
        snapshotId: string;
    } | null>(null);

    const loadSnapshots = async () => {
        setIsLoading(true);
        setError("");
        try {
            await listWebDavSnapshots();
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setConfirmAction(null);
            void loadSnapshots();
        }
    }, [isOpen]);

    const handleRestore = async (snapshotId: string) => {
        setConfirmAction(null);
        try {
            const result = await restoreWebDavSnapshot(snapshotId);
            addToast("success", result.message);
            onClose();
        } catch (err) {
            addToast("error", `恢复失败: ${err}`);
        }
    };

    const handleDelete = async (snapshotId: string) => {
        setConfirmAction(null);
        try {
            const result = await deleteWebDavSnapshot(snapshotId);
            addToast("success", result.message);
            await loadSnapshots();
        } catch (err) {
            addToast("error", `删除失败: ${err}`);
        }
    };

    const formatDateTime = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("zh-CN");
    };

    const formatBytes = (value: number) => {
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
        return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
    };

    const truncateId = (id: string) => (id.length > 8 ? id.slice(0, 8) : id);

    if (!isOpen) return null;

    const busy = isLoading || isSyncing;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-3xl">
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    onClick={onClose}
                    disabled={busy}
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-lg">WebDAV 备份管理</h3>
                        <p className="text-sm text-base-content/60 mt-0.5">
                            选择一份备份进行恢复，恢复前会自动创建本地安全备份。
                        </p>
                    </div>
                    <button
                        className="btn btn-ghost btn-sm gap-1"
                        onClick={loadSnapshots}
                        disabled={busy}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        刷新
                    </button>
                </div>

                {!syncStatus?.enabled && (
                    <div className="alert alert-warning mb-4 py-2">
                        <span className="text-sm">尚未启用 WebDAV，请先返回完成配置。</span>
                    </div>
                )}

                {error && (
                    <div className="alert alert-error mb-4 py-2">
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Loading skeleton */}
                    {isLoading && snapshots.length === 0 && (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card bg-base-200 border border-base-300">
                                    <div className="card-body p-4 gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <div className="skeleton h-4 w-40"></div>
                                                <div className="skeleton h-3 w-28"></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="skeleton h-8 w-16 rounded-btn"></div>
                                                <div className="skeleton h-8 w-16 rounded-btn"></div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="skeleton h-6 w-20 rounded-full"></div>
                                            <div className="skeleton h-6 w-24 rounded-full"></div>
                                            <div className="skeleton h-6 w-16 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && snapshots.length === 0 && (
                        <div className="card bg-base-200 border border-base-300">
                            <div className="card-body items-center text-center py-8">
                                <Clock3 className="w-10 h-10 text-base-content/30" />
                                <p className="text-base-content/60">WebDAV 中还没有备份</p>
                            </div>
                        </div>
                    )}

                    {/* Snapshot list */}
                    {snapshots.map((snapshot) => {
                        const isConfirming = confirmAction?.snapshotId === snapshot.id;
                        return (
                            <div key={snapshot.id} className="card bg-base-200 border border-base-300">
                                <div className="card-body p-4 gap-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-semibold flex items-center gap-2 text-sm">
                                                <Clock3 className="w-4 h-4 text-primary" />
                                                {formatDateTime(snapshot.createdAt)}
                                            </div>
                                            <div className="text-xs text-base-content/50 mt-0.5">
                                                ID:{" "}
                                                <span className="font-mono tooltip" data-tip={snapshot.id}>
                                                    {truncateId(snapshot.id)}
                                                </span>
                                            </div>
                                        </div>

                                        {!isConfirming && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    className="btn btn-primary btn-sm btn-outline gap-1"
                                                    onClick={() =>
                                                        setConfirmAction({ type: "restore", snapshotId: snapshot.id })
                                                    }
                                                    disabled={busy}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    恢复
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm text-error gap-1"
                                                    onClick={() =>
                                                        setConfirmAction({ type: "delete", snapshotId: snapshot.id })
                                                    }
                                                    disabled={busy}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline confirmation */}
                                    {isConfirming && (
                                        <div className={`alert py-2 ${confirmAction.type === "delete" ? "alert-error" : "alert-warning"}`}>
                                            <span className="text-sm">
                                                {confirmAction.type === "restore"
                                                    ? "确认恢复此备份？恢复前会创建本地安全备份。"
                                                    : "确认删除此备份？删除后无法恢复。"}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    onClick={() => setConfirmAction(null)}
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${confirmAction.type === "delete" ? "btn-error" : "btn-warning"}`}
                                                    onClick={() =>
                                                        confirmAction.type === "restore"
                                                            ? handleRestore(snapshot.id)
                                                            : handleDelete(snapshot.id)
                                                    }
                                                >
                                                    确认{confirmAction.type === "restore" ? "恢复" : "删除"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="badge badge-outline badge-sm">
                                            {snapshot.userCount} 个账号
                                        </span>
                                        <span className="badge badge-outline badge-sm">
                                            {formatBytes(snapshot.sizeBytes)}
                                        </span>
                                        <span className="badge badge-outline badge-sm gap-1">
                                            <Server className="w-3 h-3" />
                                            {snapshot.sourceHost}
                                        </span>
                                        {snapshot.currentUser && (
                                            <span className="badge badge-primary badge-outline badge-sm">
                                                当前: {snapshot.currentUser}
                                            </span>
                                        )}
                                    </div>

                                    {snapshot.userEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {snapshot.userEmails.map((email) => (
                                                <span key={email} className="badge badge-ghost badge-sm">
                                                    {email}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-xs text-base-content/40 flex items-center gap-1">
                                        <Download className="w-3 h-3" />
                                        {snapshot.fileName}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
                        关闭
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
}
