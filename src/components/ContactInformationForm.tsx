"use client"
import React, { useState } from 'react'
import { Send, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { Provider as ContactFormProvider } from '@/context/ContactForm/Provider';
import useContactForm from '@/context/ContactForm/useData';

export default function ContactInformationForm() {
  return (
    <ContactFormProvider>
      <ContactInformationFormInner />
    </ContactFormProvider>
  );
}

function ContactInformationFormInner() {
  const { state, setField, submitForm } = useContactForm();
  const { formData, isSubmitting } = state;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState<'confirm' | 'sending' | 'success' | 'error'>('confirm');
  const [submittedName, setSubmittedName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedName(formData.name);
    setErrorMessage('');
    setModalStage('confirm');
    setIsModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setModalStage('sending');
    const result = await submitForm();
    if (result.success) {
      setModalStage('success');
      setTimeout(() => {
        setIsModalOpen(false);
        setModalStage('confirm');
      }, 3000);
    } else {
      setErrorMessage(result.error || 'Something went wrong. Please try again.');
      setModalStage('error');
    }
  };

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(16px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-modal-fade {
          animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-modal-slide {
          animation: modalSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Name
            </span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              placeholder="Your name"
              className="h-12 w-full border border-neutral-200 dark:border-neutral-800 bg-[#F9F9F9] dark:bg-neutral-900 px-4 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white dark:focus:bg-black"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Email Address
            </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setField('email', e.target.value)}
              required
              placeholder="you@example.com"
              className="h-12 w-full border border-neutral-200 dark:border-neutral-800 bg-[#F9F9F9] dark:bg-neutral-900 px-4 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white dark:focus:bg-black"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Subject
          </span>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={(e) => setField('subject', e.target.value)}
            required
            placeholder="Production inquiry"
            className="h-12 w-full border border-neutral-200 dark:border-neutral-800 bg-[#F9F9F9] dark:bg-neutral-900 px-4 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white dark:focus:bg-black"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Message
          </span>
          <textarea
            name="message"
            value={formData.message}
            onChange={(e) => setField('message', e.target.value)}
            required
            rows={6}
            placeholder="Tell us about product type, order volume, target timeline, and destination market."
            className="min-h-36 w-full resize-y border border-neutral-200 dark:border-neutral-800 bg-[#F9F9F9] dark:bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white dark:focus:bg-black"
          />
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            Contact Us
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Modal Backdrop */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-fade">
          {/* Modal Container */}
          <div className="bg-[#f7f5ef] dark:bg-[#080808] border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 max-w-md w-full relative shadow-2xl transform animate-modal-slide text-[#191919] dark:text-[#f5f2ea] rounded-none">
            
            {/* Close Button (only show in confirm or error stage) */}
            {(modalStage === 'confirm' || modalStage === 'error') && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Stage: Confirm */}
            {modalStage === 'confirm' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold uppercase tracking-[0.1em] text-[#E02424] font-display">
                    Confirm Inquiry
                  </h3>
                  <p className="text-xs text-[#5f5a54] dark:text-[#beb7aa] leading-relaxed">
                    Please review your message details before forwarding to our sourcing team:
                  </p>
                </div>

                <div className="border-y border-neutral-200/60 dark:border-neutral-800/60 py-4 space-y-3.5 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#5f5a54] dark:text-[#beb7aa]">Name</span>
                    <span className="font-semibold">{formData.name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#5f5a54] dark:text-[#beb7aa]">Email</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#5f5a54] dark:text-[#beb7aa]">Subject</span>
                    <span className="font-medium">{formData.subject}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#5f5a54] dark:text-[#beb7aa]">Message</span>
                    <p className="text-xs bg-[#e9e6df] dark:bg-neutral-900 p-3 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-neutral-300/40 dark:border-neutral-800/40 mt-1">
                      {formData.message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-11 border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-[0.15em] text-[#5f5a54] dark:text-[#beb7aa] hover:bg-neutral-200/30 dark:hover:bg-neutral-900/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    className="flex-1 h-11 bg-[#E02424] text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-black dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2"
                  >
                    Confirm & Send
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Stage: Sending */}
            {modalStage === 'sending' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="h-10 w-10 text-[#E02424] animate-spin" />
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-[0.1em] text-sm">
                    Sending Sourcing Request
                  </h4>
                  <p className="text-xs text-[#5f5a54] dark:text-[#beb7aa]">
                    Transmitting details securely to the database...
                  </p>
                </div>
              </div>
            )}

            {/* Stage: Success */}
            {modalStage === 'success' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-8 w-8 text-[#E02424]" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-[0.1em] text-sm font-display">
                    Thank You, {submittedName}!
                  </h4>
                  <p className="text-xs text-[#5f5a54] dark:text-[#beb7aa] max-w-[280px] mx-auto leading-relaxed">
                    Your inquiry has been successfully received and saved. Our team will contact you shortly.
                  </p>
                </div>
              </div>
            )}

            {/* Stage: Error */}
            {modalStage === 'error' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-[#E02424]" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-[0.1em] text-sm text-[#E02424]">
                    Submission Failed
                  </h4>
                  <p className="text-xs text-[#5f5a54] dark:text-[#beb7aa] max-w-[280px] mx-auto leading-relaxed">
                    {errorMessage || "Something went wrong while sending your inquiry."}
                  </p>
                </div>
                <div className="pt-2 w-full">
                  <button
                    type="button"
                    onClick={() => setModalStage('confirm')}
                    className="w-full h-11 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold uppercase tracking-[0.15em] text-white dark:text-black transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}