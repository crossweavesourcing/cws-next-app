// types/contact.types.ts
export interface FormData {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  honeypot?: string;
  idempotencyKey?: string;
}

export interface FormState {
  formData: FormData;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
}



export interface ContextType {
  state: FormState;
  setField: (field: keyof FormData, value: string) => void;
  resetForm: () => void;
  submitForm: () => Promise<{ success: boolean; error?: string }>;
  clearStatus: () => void;
}

export type Action =
                    | { type: 'SET_FIELD'; payload: { field: keyof FormData; value: string } }
                    | { type: 'RESET_FORM' }
                    | { type: 'RESET_FORM_FIELDS' }
                    | { type: 'SET_SUBMITTING' }
                    | { type: 'SET_SUBMIT_SUCCESS' }
                    | { type: 'SET_SUBMIT_ERROR'; payload: string }
                    | { type: 'CLEAR_SUBMIT_STATUS' };