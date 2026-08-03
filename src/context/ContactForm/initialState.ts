import { FormState } from "./types";
const initialState: FormState = {
  formData: { name: '', email: '', company: '', subject: '', message: '', honeypot: '', idempotencyKey: '' },
  isSubmitting: false,
  submitSuccess: false,
  submitError: null,
};
export default initialState