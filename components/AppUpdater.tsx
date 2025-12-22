import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, Smartphone, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
    checkForUpdate,
    downloadAndInstallUpdate,
    formatBytes,
    formatRelativeDate,
    APP_VERSION,
    UpdateCheckResult
} from '../services/updateService';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'upToDate' | 'error';

const AppUpdater: React.FC = () => {
    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckForUpdates = async () => {
        setStatus('checking');
        setError(null);

        try {
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Light });
            }

            const result = await checkForUpdate();
            setUpdateInfo(result);

            if (result.updateAvailable) {
                setStatus('available');
                if (Capacitor.isNativePlatform()) {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                }
            } else {
                setStatus('upToDate');
            }
        } catch (err) {
            setStatus('error');
            setError('Failed to check for updates');
            console.error(err);
        }
    };

    const handleDownloadUpdate = async () => {
        if (!updateInfo?.latestRelease?.downloadUrl) return;

        setStatus('downloading');

        try {
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Medium });
            }

            const success = await downloadAndInstallUpdate(updateInfo.latestRelease.downloadUrl);

            if (!success) {
                setError('Download may have failed. Check your downloads.');
            }
        } catch (err) {
            setStatus('error');
            setError('Failed to download update');
            console.error(err);
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'checking':
                return <RefreshCw size={18} className="animate-spin text-helm-accent" />;
            case 'available':
                return <Download size={18} className="text-emerald-400" />;
            case 'upToDate':
                return <CheckCircle size={18} className="text-emerald-400" />;
            case 'error':
                return <AlertCircle size={18} className="text-red-400" />;
            default:
                return <Smartphone size={18} className="text-helm-accent" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'checking':
                return 'Checking for updates...';
            case 'available':
                return 'Update available!';
            case 'downloading':
                return 'Opening download...';
            case 'upToDate':
                return 'You\'re up to date';
            case 'error':
                return error || 'Something went wrong';
            default:
                return `Current version: v${APP_VERSION}`;
        }
    };

    // Only show full updater on native platform
    if (!Capacitor.isNativePlatform()) {
        return (
            <div className="bg-helm-800 rounded-xl border border-helm-700 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={18} className="text-helm-accent" />
                    <h3 className="font-semibold text-white">App Updates</h3>
                </div>
                <p className="text-xs text-helm-400">
                    In-app updates are only available on the Android app.
                </p>
                <a
                    href="https://github.com/Misterobots/Dashboarrd_App/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-helm-900 border border-helm-700 active:bg-helm-700 transition-colors"
                >
                    <span className="text-xs font-medium text-helm-300">Download Latest Release</span>
                    <ExternalLink size={14} className="text-helm-500" />
                </a>
                <p className="text-center text-xs text-helm-600">v{APP_VERSION}</p>
            </div>
        );
    }

    return (
        <div className="bg-helm-800 rounded-xl border border-helm-700 p-4 space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <h3 className="font-semibold text-white">App Updates</h3>
                </div>
                {status === 'upToDate' && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-500/10 rounded-full">
                        <CheckCircle size={12} /> Latest
                    </div>
                )}
                {status === 'available' && (
                    <div className="flex items-center gap-1.5 text-helm-accent text-xs font-medium px-2 py-1 bg-helm-accent/10 rounded-full animate-pulse">
                        <Download size={12} /> New!
                    </div>
                )}
            </div>

            <p className="text-sm text-helm-300">{getStatusText()}</p>

            {/* Update Available Details */}
            {status === 'available' && updateInfo?.latestRelease && (
                <div className="bg-helm-900/50 rounded-lg p-3 space-y-2 border border-helm-700/50">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-helm-400">New Version</span>
                        <span className="text-xs font-mono text-emerald-400">
                            v{updateInfo.latestRelease.version}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-helm-400">Size</span>
                        <span className="text-xs text-helm-300">
                            {formatBytes(updateInfo.latestRelease.size)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-helm-400">Released</span>
                        <span className="text-xs text-helm-300">
                            {formatRelativeDate(updateInfo.latestRelease.publishedAt)}
                        </span>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {status === 'idle' || status === 'upToDate' || status === 'error' ? (
                <button
                    onClick={handleCheckForUpdates}
                    className="w-full py-2.5 bg-helm-700 hover:bg-helm-600 active:bg-helm-accent rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} />
                    Check for Updates
                </button>
            ) : status === 'available' ? (
                <button
                    onClick={handleDownloadUpdate}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                >
                    <Download size={16} />
                    Download & Install
                </button>
            ) : status === 'checking' ? (
                <div className="w-full py-2.5 bg-helm-700/50 rounded-lg text-sm font-medium text-helm-400 flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    Checking...
                </div>
            ) : null}

            <p className="text-center text-xs text-helm-600">
                Installed: v{APP_VERSION}
            </p>
        </div>
    );
};

export default AppUpdater;
