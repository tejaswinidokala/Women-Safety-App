/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, MicOff, Grid, Volume2, UserPlus, Video, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FakeCallModalProps {
  isOpen: boolean;
  callerName: string;
  onClose: () => void;
}

export default function FakeCallModal({ isOpen, callerName, onClose }: FakeCallModalProps) {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Synthesize telephone ringing sound using Web Audio API
  const startRingingSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const playRingTone = () => {
        if (!ctx || ctx.state === 'suspended') return;
        
        // North American Ringback Tone: 440Hz + 480Hz
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 1.8);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();

        osc1.stop(ctx.currentTime + 2.1);
        osc2.stop(ctx.currentTime + 2.1);
      };

      playRingTone();
      ringIntervalRef.current = setInterval(playRingTone, 4000);
    } catch (err) {
      console.warn('Web Audio Ringing failed:', err);
    }
  };

  const stopRingingSound = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // Handle active ringing effects
  useEffect(() => {
    if (isOpen && callState === 'ringing') {
      startRingingSound();
    }
    return () => {
      stopRingingSound();
    };
  }, [isOpen, callState]);

  // Handle Call Timer
  useEffect(() => {
    let timer: any = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Speech synthesis for interactive mock helper conversation
  const triggerSpeechSim = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const text = `Hey there! Where are you? I'm waiting for you right now, let me know if you need me to pick you up. I can head over in five minutes!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = () => {
    stopRingingSound();
    setCallState('connected');
    triggerSpeechSim();
  };

  const handleDecline = () => {
    stopRingingSound();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCallState('ended');
    setTimeout(() => {
      onClose();
      setCallState('ringing');
    }, 800);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0c1015] text-white flex flex-col justify-between p-8 font-sans select-none"
        id="fake-call-modal-overlay"
      >
        {/* Top Status */}
        <div className="flex flex-col items-center mt-12 space-y-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center text-2xl font-bold uppercase tracking-wider text-gray-100 shadow-md">
            {callerName ? callerName[0] : 'U'}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3 text-center">
            {callerName || 'Unknown Caller'}
          </h2>
          <p className="text-sm font-semibold tracking-wider uppercase text-gray-400">
            {callState === 'ringing' && 'Incoming Call...'}
            {callState === 'connected' && 'Stay Safe Simulator'}
            {callState === 'ended' && 'Call Ended'}
          </p>
          {callState === 'connected' && (
            <span className="text-teal-400 font-mono font-bold text-lg bg-teal-950/40 border border-teal-800/30 px-3 py-1 rounded-full mt-2">
              {formatTime(seconds)}
            </span>
          )}
        </div>

        {/* Center UI based on call status */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {callState === 'connected' ? (
            <div className="grid grid-cols-3 gap-y-8 gap-x-12 max-w-xs w-full px-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center space-y-2 ${isMuted ? 'text-teal-400' : 'text-gray-300'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white' : 'bg-gray-800/80 hover:bg-gray-800'}`}>
                  <MicOff className={`w-6 h-6 ${isMuted ? 'text-black' : 'text-white'}`} />
                </div>
                <span className="text-xs font-medium">mute</span>
              </button>

              <button className="flex flex-col items-center space-y-2 text-gray-300">
                <div className="w-14 h-14 rounded-full bg-gray-800/80 hover:bg-gray-800 flex items-center justify-center transition-all">
                  <Grid className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">keypad</span>
              </button>

              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`flex flex-col items-center space-y-2 ${isSpeaker ? 'text-teal-400' : 'text-gray-300'}`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeaker ? 'bg-white' : 'bg-gray-800/80 hover:bg-gray-800'}`}>
                  <Volume2 className={`w-6 h-6 ${isSpeaker ? 'text-black' : 'text-white'}`} />
                </div>
                <span className="text-xs font-medium">speaker</span>
              </button>

              <button className="flex flex-col items-center space-y-2 text-gray-300 opacity-60">
                <div className="w-14 h-14 rounded-full bg-gray-800/80 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">add call</span>
              </button>

              <button className="flex flex-col items-center space-y-2 text-gray-300 opacity-60">
                <div className="w-14 h-14 rounded-full bg-gray-800/80 flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">FaceTime</span>
              </button>

              <button className="flex flex-col items-center space-y-2 text-gray-300">
                <div className="w-14 h-14 rounded-full bg-gray-800/80 hover:bg-gray-800 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">contacts</span>
              </button>
            </div>
          ) : callState === 'ringing' ? (
            <div className="flex flex-col items-center space-y-4 max-w-xs px-6 py-4 bg-gray-900/40 border border-gray-800/60 rounded-2xl">
              <MessageSquare className="w-6 h-6 text-teal-400 animate-pulse" />
              <p className="text-xs text-gray-400 font-medium text-center leading-relaxed">
                "Answer the call to trigger a simulated voice. Perfect for exiting uncomfortable conversations."
              </p>
            </div>
          ) : null}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-around w-full max-w-sm mx-auto mb-12">
          {callState === 'ringing' ? (
            <>
              {/* Decline Button */}
              <button
                onClick={handleDecline}
                className="flex flex-col items-center space-y-3 focus:outline-none"
                id="decline-fake-call-btn"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/45 animate-pulse relative">
                  <PhoneOff className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Decline</span>
              </button>

              {/* Answer Button */}
              <button
                onClick={handleAnswer}
                className="flex flex-col items-center space-y-3 focus:outline-none"
                id="answer-fake-call-btn"
              >
                <div className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-950/45 relative">
                  <span className="absolute inset-0 rounded-full bg-teal-500 animate-ping opacity-25" />
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs font-bold text-teal-400 tracking-wider uppercase">Answer</span>
              </button>
            </>
          ) : (
            /* End Call Button */
            <button
              onClick={handleDecline}
              className="flex flex-col items-center space-y-3 focus:outline-none w-full"
              id="end-fake-call-btn"
            >
              <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/45">
                <PhoneOff className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-bold text-red-500 tracking-wider uppercase">End Call</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
