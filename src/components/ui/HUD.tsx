import React, { useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useSpeech } from "@/hooks/useSpeech";

interface HUDProps {
    onAnalyze: (transcript: string) => void;
    coachData: { rhymes: string[]; nextTopic: string } | null;
    loading: boolean;
}

export function HUD({ onAnalyze, coachData, loading }: HUDProps) {
    const { isListening, stopListening, toggleListening, error } = useSpeech({
        onTranscript: (t) => {
            // Po każdej częściowo "końcowej" wypowiedzi poproś o analizę do Gemini
            onAnalyze(t);
        },
    });

    return (
        <Html center distanceFactor={10} position={[0, -1.5, 1]} zIndexRange={[100, 0]}>
            <div className="flex flex-col items-center justify-end h-80 w-96 transform scale-[2] text-white font-sans pointer-events-auto">
                {/* Panel Główny - Symulacja coachingu na HUD */}
                <div className="bg-black/70 p-6 rounded-2xl border border-cyan-500/50 backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,255,0.15)] w-full mb-6 relative overflow-hidden">

                    {/* Odblask górny dla futurystycznego vibe'u */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {isListening ? (
                                <Mic className="text-cyan-400 w-6 h-6 animate-pulse" />
                            ) : (
                                <MicOff className="text-gray-500 w-6 h-6" />
                            )}
                            <h2 className="text-xl font-bold tracking-widest uppercase text-cyan-400">Rap Coach</h2>
                        </div>
                        {loading && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                    </div>

                    <div className="space-y-4 min-h-[140px]">
                        <div>
                            <p className="text-xs text-cyan-300/60 uppercase font-semibold mb-1">Status systemu</p>
                            <p className="text-sm font-medium">
                                {error ? <span className="text-red-400">{error}</span> :
                                    isListening ? "Nasłuchiwanie..." :
                                        loading ? "Analiza flow..." :
                                            "Zaczynamy? Kliknij mikrofon."}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {coachData && !loading && (
                                <motion.div
                                    className="grid grid-cols-2 gap-4"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div>
                                        <p className="text-xs text-purple-400/80 uppercase font-bold tracking-wider mb-2">Sugestie rymów</p>
                                        <ul className="text-sm font-medium space-y-2">
                                            {coachData.rhymes.map((r, i) => (
                                                <motion.li
                                                    key={`${r}-${i}`}
                                                    className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.15 }}
                                                >
                                                    {r}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-xs text-orange-400/80 uppercase font-bold tracking-wider mb-2">Zmień temat na</p>
                                        <motion.div
                                            className="text-sm font-bold text-orange-300 bg-orange-950/60 px-3 py-2 rounded-lg border border-orange-500/30 inline-block shadow-[0_0_15px_rgba(255,165,0,0.1)]"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                                        >
                                            {coachData.nextTopic}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Main Action Button */}
                <button
                    className={`w-full font-bold py-3 px-4 rounded-xl text-sm transition-all tracking-wider uppercase border ${isListening
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(255,0,0,0.2)]"
                            : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                        }`}
                    onClick={toggleListening}
                >
                    {isListening ? "Zatrzymaj" : "Rozpocznij Freestyle"}
                </button>
            </div>
        </Html>
    );
}
