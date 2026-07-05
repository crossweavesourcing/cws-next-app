import { FormState, Action } from "./types";
import initialState from "./initialState";

export default function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        formData: { ...state.formData, [action.payload.field]: action.payload.value }
      };
    case 'RESET_FORM':
      return { ...initialState };
    case 'RESET_FORM_FIELDS':
      return { ...state, formData: { ...initialState.formData } };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: true, submitError: null };
    case 'SET_SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, submitSuccess: true };
    case 'SET_SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.payload };
    case 'CLEAR_SUBMIT_STATUS':
      return { ...state, submitSuccess: false, submitError: null };
    default:
      return state;
  }
}