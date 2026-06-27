/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Contact } from '../types';
import { Trash2, UserPlus, ShieldCheck, ArrowLeft, User, Phone, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactManagementProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, 'id' | 'avatarColor'>) => void;
  onDeleteContact: (id: string) => void;
}

// Pastel avatar color mapper to match screenshots perfectly
export const getPastelColors = (name: string, index = 0) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  const styles = [
    { bg: '#E0E7FF', text: '#4338CA' }, // Pastel Indigo
    { bg: '#FCE7F3', text: '#BE185D' }, // Pastel Pink
    { bg: '#D1FAE5', text: '#047857' }, // Pastel Emerald
    { bg: '#FEF3C7', text: '#B45309' }, // Pastel Amber
    { bg: '#E0F2FE', text: '#0369A1' }, // Pastel Light Blue
    { bg: '#F3E8FF', text: '#6D28D9' }, // Pastel Purple
  ];
  return styles[hash % styles.length];
};

export default function ContactManagement({
  contacts,
  onAddContact,
  onDeleteContact,
}: ContactManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number.');
      return;
    }
    onAddContact({ name, phone });
    setName('');
    setPhone('');
    setError('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="flex flex-col h-full bg-[#FCF5F5] font-sans pb-24" id="add-contact-view">
        {/* Header - Back arrow on left, centered logo */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-red-50 sticky top-0 z-30">
          <button
            onClick={() => setIsAdding(false)}
            className="p-1 rounded-full hover:bg-red-50 text-[#D32F2F] transition-colors"
            id="back-to-contacts-btn"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight text-[#D32F2F] font-sans text-center flex-1 pr-8">
            SAFETY CORE
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight font-sans">
              New Contact
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed font-sans font-medium">
              Add a trusted individual who will be notified instantly during an SOS event.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-900 tracking-wider uppercase block">
                FULL NAME
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-gray-900 placeholder-gray-400 font-medium pr-11 text-sm"
                  id="contact-name-input"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-900 tracking-wider uppercase block">
                PHONE NUMBER
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-gray-900 placeholder-gray-400 font-medium pr-11 text-sm"
                  id="contact-phone-input"
                />
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Privacy Box */}
            <div className="flex gap-4 p-4.5 bg-white border border-[#F5CACA] rounded-2xl shadow-sm">
              <div className="p-2.5 bg-red-100/50 text-[#D32F2F] rounded-xl h-fit shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  DATA PRIVACY
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Emergency contacts are only accessed when you trigger a life-safety alert. Their information is encrypted and never shared for marketing.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold tracking-wide rounded-2xl shadow-lg active:scale-[0.98] transition-all cursor-pointer text-sm"
              id="save-contact-submit-btn"
            >
              SAVE CONTACT
              <ShieldCheck className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-xs font-medium text-gray-400 font-sans">
            Action cannot be undone without authentication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FCF5F5] font-sans pb-24" id="contacts-list-view">
      {/* Header - Shield icon + Title, profile avatar on right */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-red-50 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#D32F2F] stroke-[2.5]" />
          <h1 className="text-xl font-black text-red-900 tracking-tight font-sans uppercase">
            Emergency Contacts
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500">
          <User className="w-5 h-5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Network Status Banner */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase font-sans">
              Trusted Network
            </span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed font-sans font-medium">
            These contacts will be alerted immediately if you trigger an SOS.
          </p>
        </div>

        {/* Contacts List */}
        <div className="space-y-3.5">
          <AnimatePresence initial={false}>
            {contacts.map((contact, index) => {
              const colors = getPastelColors(contact.name, index);
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 bg-white border border-[#F5CACA] rounded-2xl shadow-sm hover:shadow-md transition-all"
                  id={`contact-card-${contact.id}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Initials Avatar using beautiful pastel palette matching screenshots */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base tracking-wider shadow-inner shrink-0"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {contact.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-950 tracking-tight text-lg font-sans leading-tight">
                        {contact.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium font-sans mt-0.5">
                        {contact.phone}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteContact(contact.id)}
                    className="p-2.5 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-600 active:scale-95 transition-all border border-transparent hover:border-red-50 cursor-pointer"
                    id={`delete-contact-btn-${contact.id}`}
                    title="Remove Contact"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Recommended guidelines box */}
          <div className="p-6 border-2 border-dashed border-[#F5CACA] bg-transparent rounded-2xl flex flex-col items-center text-center justify-center space-y-3">
            <div className="p-3 bg-red-100/50 rounded-full text-[#D32F2F]">
              <UserPlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-[240px]">
              Recommended: Add at least 3 emergency contacts for maximum safety coverage.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Add Contact Button Container - placed beautifully at bottom-right of scroll section */}
      <div className="p-6 flex justify-end shrink-0 bg-transparent">
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold tracking-wide rounded-2xl shadow-lg active:scale-[0.97] transition-all text-xs cursor-pointer"
          id="add-contact-trigger-btn"
        >
          <UserPlus className="w-4 h-4" />
          ADD CONTACT
        </button>
      </div>
    </div>
  );
}
