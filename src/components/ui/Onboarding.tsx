'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Eye, ArrowRight } from 'lucide-react'

interface OnboardingProps {
    onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white font-mono uppercase tracking-widest selection:bg-cyan-500/50">
            
            {/* Minimalist Grid / Pattern BG */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            <div className="max-w-md w-full px-8 text-center space-y-12 relative z-10">
                
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div 
                            key="step0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <h1 className="text-4xl font-bold border-b-4 border-cyan-500 pb-4 inline-block tracking-[0.2em]">
                                THREESTYLE
                            </h1>
                            <p className="text-zinc-500 text-sm leading-loose">
                                TO JEST MUZYKA AI. <br />
                                NIE UDAJEMY NATURALNYCH ARTYSTÓW. <br />
                                TWOJE STUDIO JEST GOTOWE.
                            </p>
                            <button 
                                onClick={() => setStep(1)}
                                className="group flex items-center gap-4 mx-auto pt-8 text-cyan-400 hover:text-white transition-colors"
                            >
                                <span className="text-xs">WEJDŹ W SYSTEM</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                        >
                            <div className="flex justify-center gap-12">
                                <div className="space-y-4">
                                    <Headphones className="w-10 h-10 mx-auto text-pink-500" />
                                    <p className="text-[10px] text-zinc-500">ZALECANE SŁUCHAWKI</p>
                                </div>
                                <div className="space-y-4">
                                    <Eye className="w-10 h-10 mx-auto text-cyan-400" />
                                    <p className="text-[10px] text-zinc-500">DYNAMICZNY ŚWIAT</p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={onComplete}
                                    className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:bg-white hover:text-black transition-all duration-500 text-sm font-bold tracking-[0.3em]"
                                >
                                    LOGOWANIE PRZEZ SUPABASE
                                </button>
                                <p className="pt-4 text-[9px] text-zinc-700 italic">
                                    PRZECHODZĄC DALEJ AKCEPTUJESZ WARUNKI SPRINTU B3P
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
            
            {/* Bottom status line */}
            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                <span>V.1.0.0_ALPHA</span>
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    CONNECTION: BROADCAST_READY
                </span>
            </div>

        </div>
    )
}
