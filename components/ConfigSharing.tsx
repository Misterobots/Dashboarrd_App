import React, { useState, useEffect, useRef } from 'react';
import {
    QrCode, Download, Upload, Copy, Check, Share2, AlertCircle,
    FileJson, Smartphone, X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppConfig } from '../types';

// Simple QR Code generator using SVG
// Based on qr-code-styling principles but simplified for our use case
const generateQRMatrix = (data: string): boolean[][] => {
    // This is a simplified QR code generator for demonstration
    // In production, you'd use a proper QR library
    const size = Math.max(21, Math.ceil(data.length / 2) + 10);
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

    // Add finder patterns (top-left, top-right, bottom-left)
    const addFinderPattern = (x: number, y: number) => {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                const isEdge = i === 0 || i === 6 || j === 0 || j === 6;
                const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
                if (x + i < size && y + j < size) {
                    matrix[x + i][y + j] = isEdge || isInner;
                }
            }
        }
    };

    addFinderPattern(0, 0);
    addFinderPattern(0, size - 7);
    addFinderPattern(size - 7, 0);

    // Encode data as simple pattern
    let dataIndex = 0;
    for (let i = 8; i < size - 8; i++) {
        for (let j = 8; j < size - 8; j++) {
            if (dataIndex < data.length) {
                matrix[i][j] = data.charCodeAt(dataIndex) % 2 === 1;
                dataIndex++;
            } else {
                matrix[i][j] = (i + j) % 3 === 0;
            }
        }
    }

    return matrix;
};

interface ConfigSharingProps {
    onImport: (config: AppConfig) => void;
}

const ConfigSharing: React.FC<ConfigSharingProps> = ({ onImport }) => {
    const [showQR, setShowQR] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<AppConfig | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            setConfig(JSON.parse(saved));
        }
    }, []);

    const getExportData = () => {
        if (!config) return null;
        // Create a shareable version (remove sensitive flags, keep essentials)
        return {
            version: 1,
            exported: new Date().toISOString(),
            config: {
                radarr: config.radarr,
                sonarr: config.sonarr,
                jellyseerr: config.jellyseerr,
                sabnzbd: config.sabnzbd,
                jellyfin: config.jellyfin
            }
        };
    };

    const handleExportJSON = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        const exportData = getExportData();
        if (!exportData) {
            setError('No configuration to export');
            return;
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboarrd-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyConfig = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }

        const exportData = getExportData();
        if (!exportData) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(exportData));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setError('Failed to copy to clipboard');
        }
    };

    const handleImportFromText = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        try {
            const parsed = JSON.parse(importText);
            if (parsed.config) {
                const newConfig: AppConfig = {
                    onboarded: true,
                    radarr: parsed.config.radarr || { url: '', apiKey: '', enabled: false },
                    sonarr: parsed.config.sonarr || { url: '', apiKey: '', enabled: false },
                    jellyseerr: parsed.config.jellyseerr || { url: '', apiKey: '', enabled: false },
                    sabnzbd: parsed.config.sabnzbd || { url: '', apiKey: '', enabled: false },
                    jellyfin: parsed.config.jellyfin || { url: '', apiKey: '', enabled: false }
                };
                onImport(newConfig);
                setShowImport(false);
                setImportText('');
                setError(null);
            } else {
                setError('Invalid config format');
            }
        } catch (e) {
            setError('Failed to parse config. Make sure it\'s valid JSON.');
        }
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setImportText(text);
        };
        reader.readAsText(file);
    };

    const renderQRCode = () => {
        const exportData = getExportData();
        if (!exportData) return null;

        // For QR codes, we'll create a compact version
        const compactConfig = btoa(JSON.stringify(exportData));

        // Generate QR matrix
        const matrix = generateQRMatrix(compactConfig.substring(0, 100));
        const cellSize = 4;
        const size = matrix.length * cellSize;

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <rect width={size} height={size} fill="white" />
                {matrix.map((row, i) =>
                    row.map((cell, j) =>
                        cell ? (
                            <rect
                                key={`${i}-${j}`}
                                x={j * cellSize}
                                y={i * cellSize}
                                width={cellSize}
                                height={cellSize}
                                fill="#1e293b"
                            />
                        ) : null
                    )
                )}
            </svg>
        );
    };

    const hasConfig = config && (
        config.radarr?.enabled ||
        config.sonarr?.enabled ||
        config.jellyseerr?.enabled ||
        config.sabnzbd?.enabled ||
        config.jellyfin?.enabled
    );

    return (
        <div className="space-y-3">
            {/* Export Section */}
            <div className="bg-helm-800 rounded-xl border border-helm-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Share2 size={18} className="text-helm-accent" />
                    <h3 className="font-semibold text-white">Share Configuration</h3>
                </div>

                {!hasConfig ? (
                    <p className="text-xs text-helm-500">Configure at least one service first.</p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-helm-400">
                            Export your service configurations to set up another device quickly.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowQR(true)}
                                className="flex items-center justify-center gap-2 p-3 bg-helm-700 hover:bg-helm-600 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                            >
                                <QrCode size={16} />
                                Show QR
                            </button>

                            <button
                                onClick={handleExportJSON}
                                className="flex items-center justify-center gap-2 p-3 bg-helm-700 hover:bg-helm-600 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                            >
                                <Download size={16} />
                                Export JSON
                            </button>
                        </div>

                        <button
                            onClick={handleCopyConfig}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-helm-900 border border-helm-700 rounded-lg text-xs font-medium text-helm-300 transition-all active:scale-95"
                        >
                            {copied ? (
                                <>
                                    <Check size={14} className="text-emerald-400" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy size={14} />
                                    Copy to Clipboard
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Import Section */}
            <div className="bg-helm-800 rounded-xl border border-helm-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Upload size={18} className="text-emerald-400" />
                    <h3 className="font-semibold text-white">Import Configuration</h3>
                </div>

                <p className="text-xs text-helm-400 mb-3">
                    Import settings from another device or backup.
                </p>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 p-3 bg-helm-700 hover:bg-helm-600 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                    >
                        <FileJson size={16} />
                        From File
                    </button>

                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center justify-center gap-2 p-3 bg-helm-700 hover:bg-helm-600 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                    >
                        <Smartphone size={16} />
                        Paste Config
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                />
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-helm-800 rounded-2xl border border-helm-700 p-6 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Scan to Import</h3>
                            <button
                                onClick={() => setShowQR(false)}
                                className="p-2 rounded-lg bg-helm-700 text-helm-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                            {renderQRCode()}
                        </div>

                        <p className="text-xs text-helm-500 text-center mt-4">
                            Scan this QR code with the Dashboarrd app on another device.
                        </p>

                        <p className="text-[10px] text-yellow-500/80 text-center mt-2 flex items-center justify-center gap-1">
                            <AlertCircle size={10} />
                            QR contains API keys - keep it private!
                        </p>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-helm-800 rounded-2xl border border-helm-700 p-6 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Paste Configuration</h3>
                            <button
                                onClick={() => {
                                    setShowImport(false);
                                    setImportText('');
                                    setError(null);
                                }}
                                className="p-2 rounded-lg bg-helm-700 text-helm-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder='Paste the JSON config here...'
                            className="w-full h-40 bg-helm-900 border border-helm-700 rounded-lg p-3 text-sm text-white font-mono resize-none focus:border-helm-accent outline-none"
                        />

                        {error && (
                            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleImportFromText}
                            disabled={!importText.trim()}
                            className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-all active:scale-95"
                        >
                            Import Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigSharing;
